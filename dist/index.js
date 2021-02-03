module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(507);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 44:
/***/ (function(module) {

module.exports = eval("require")("xml-js");


/***/ }),

/***/ 244:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 266:
/***/ (function(module) {

module.exports = eval("require")("@actions/glob");


/***/ }),

/***/ 268:
/***/ (function(module) {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 507:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(244);
const action = __webpack_require__(872);

(async () => {
    try {
        await action();
    } catch (error) {
        core.setFailed(error.message);
    }
})();


/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 845:
/***/ (function(module, __unusedexports, __webpack_require__) {

const glob = __webpack_require__(266);
const core = __webpack_require__(244);
const fs = __webpack_require__(747);
const parser = __webpack_require__(44);

const resolveFileAndLine = (file, classname, output) => {
    const filename = file ? file : classname.split('.').slice(-1)[0];
    const matches = output.match(new RegExp(`${filename}.*?:\\d+`, 'g'));
    if (!matches) return { filename: filename, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.split(':');
    core.debug(`Resolved file ${filename} and line ${line}`);

    return { filename, line: parseInt(line) };
};

const resolvePath = async filename => {
    core.debug(`Resolving path for ${filename}`);
    const globber = await glob.create(`**/${filename}.*`, { followSymbolicLinks: false });
    const results = await globber.glob();
    core.debug(`Matched files: ${results}`);
    const searchPath = globber.getSearchPaths()[0];

    let path = '';
    if (results.length) {
        // skip various temp folders
        const found = results.find(r => !r.includes('__pycache__'));
        if (found) path = found.slice(searchPath.length + 1);
        else path = filename;
    } else {
        path = filename;
    }
    core.debug(`Resolved path: ${path}`);

    // canonicalize to make windows paths use forward slashes
    const canonicalPath = path.replace(/\\/g, '/');
    core.debug(`Canonical path: ${canonicalPath}`);

    return canonicalPath;
};

async function parseFile(file) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);

    const report = JSON.parse(parser.xml2json(data, { compact: true }));
    const testsuites = report.testsuite
        ? [report.testsuite]
        : Array.isArray(report.testsuites.testsuite)
            ? report.testsuites.testsuite
            : [report.testsuites.testsuite];

    for (const testsuite of testsuites) {
        const testcases = Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : testsuite.testcase
                ? [testsuite.testcase]
                : [];
        for (const testcase of testcases) {
            count++;
            if (testcase.skipped) skipped++;
            if (testcase.failure || testcase.error) {
                const stackTrace = (
                    (testcase.failure && testcase.failure._cdata) ||
                    (testcase.failure && testcase.failure._text) ||
                    (testcase.error && testcase.error._cdata) ||
                    (testcase.error && testcase.error._text) ||
                    ''
                ).trim();

                const message = (
                    (testcase.failure &&
                        testcase.failure._attributes &&
                        testcase.failure._attributes.message) ||
                    (testcase.error &&
                        testcase.error._attributes &&
                        testcase.error._attributes.message) ||
                    stackTrace.split('\n').slice(0, 2).join('\n')
                ).trim();

                const { filename, line } = resolveFileAndLine(
                    testcase._attributes.file,
                    testcase._attributes.classname,
                    stackTrace
                );

                const path = await resolvePath(filename);
                const title = `${filename}.${testcase._attributes.name}`;
                core.info(`${path}:${line} | ${message.replace(/\n/g, ' ')}`);

                annotations.push({
                    path,
                    start_line: line,
                    end_line: line,
                    start_column: 0,
                    end_column: 0,
                    annotation_level: 'failure',
                    title,
                    message,
                    raw_details: stackTrace
                });
            }
        }
    }
    return { count, skipped, annotations };
}

const parseTestReports = async reportPaths => {
    const globber = await glob.create(reportPaths, { followSymbolicLinks: false });
    let annotations = [];
    let count = 0;
    let skipped = 0;
    for await (const file of globber.globGenerator()) {
        const { count: c, skipped: s, annotations: a } = await parseFile(file);
        if (c == 0) continue;
        count += c;
        skipped += s;
        annotations = annotations.concat(a);
    }
    return { count, skipped, annotations };
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };


/***/ }),

/***/ 872:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(244);
const github = __webpack_require__(268);
const { parseTestReports } = __webpack_require__(845);

const action = async () => {
    const reportPaths = core.getInput('report_paths').split(',').join('\n');
    core.info(`Going to parse results form ${reportPaths}`);
    const githubToken = core.getInput('github_token');
    const name = core.getInput('check_name');
    const commit = core.getInput('commit');
    const failOnFailedTests = core.getInput('fail_on_test_failures') === 'true';
    const failIfNoTests = core.getInput('fail_if_no_tests') === 'true';

    let { count, skipped, annotations } = await parseTestReports(reportPaths);
    const foundResults = count > 0 || skipped > 0;
    const title = foundResults
        ? `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`
        : 'No test results found!';
    core.info(`Result: ${title}`);

    const pullRequest = github.context.payload.pull_request;
    const link = (pullRequest && pullRequest.html_url) || github.context.ref;
    const conclusion =
        (foundResults && annotations.length === 0) || (!foundResults && !failIfNoTests)
            ? 'success'
            : 'failure';
    const status = 'completed';
    const head_sha = commit || (pullRequest && pullRequest.head.sha) || github.context.sha;
    core.info(
        `Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${head_sha})`
    );

    const createCheckRequest = {
        ...github.context.repo,
        name,
        head_sha,
        status,
        conclusion,
        output: {
            title,
            summary: '',
            annotations: annotations.slice(0, 50)
        }
    };

    core.debug(JSON.stringify(createCheckRequest, null, 2));

    // make conclusion consumable by downstream actions
    core.setOutput('conclusion', conclusion);

    const octokit = new github.GitHub(githubToken);
    await octokit.checks.create(createCheckRequest);

    // optionally fail the action if tests fail
    if (failOnFailedTests && conclusion !== 'success') {
        core.setFailed(`There were ${annotations.length} failed tests`);
    }
};

module.exports = action;


/***/ })

/******/ });