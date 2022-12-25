const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const parser = require('xml-js');

const resolveFileAndLine = (file, classname, output) => {
    // extract filename from classname and remove suffix
    // const filename = file ? file : classname.split('.').slice(-1)[0].split('(')[0];
    const filename = output.split(':')[0].trim()
    console.log({file, filename, classname, output});
    const matches = output.match(new RegExp(`${filename}.*?:\\d+`, 'g'));
    console.log({matches});
    if (!matches) return { filename: filename, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.split(':');
    core.info(`Resolved file ${filename} and line ${line}`);
    return { filename, line: parseInt(line) };
};

const resolvePath = async filename => {
    core.info(`Resolving path for ${filename}`);
    const globber = await glob.create(`**/(${filename}.*|${filename})`, { followSymbolicLinks: false });
    const results = await globber.glob();
    core.info(`Matched files: ${results}`);
    const searchPath = globber.getSearchPaths()[0];

    let path = '';
    if (results.length) {
        // skip various temp folders
        const found = results.find(r => !r.includes('__pycache__') && !r.endsWith('.class'));
        if (found) path = found.slice(searchPath.length + 1);
        else path = filename;
    } else {
        path = filename;
    }
    core.info(`Resolved path: ${path}`);

    // canonicalize to make windows paths use forward slashes
    const canonicalPath = path.replace(/\\/g, '/');
    core.info(`Canonical path: ${canonicalPath}`);

    return canonicalPath;
};

async function parseFile(file) {
    core.info(`Parsing file ${file}`);
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
            if (testcase.failure || testcase.flakyFailure || testcase.error) {
                console.log('testcase:');
                console.log(testcase);
                let testcaseData =
                    (testcase.failure && testcase.failure._cdata) ||
                    (testcase.failure && testcase.failure._text) ||
                    (testcase.flakyFailure && testcase.flakyFailure._cdata) ||
                    (testcase.flakyFailure && testcase.flakyFailure._text) ||
                    (testcase.error && testcase.error._cdata) ||
                    (testcase.error && testcase.error._text) ||
                    '';
                testcaseData = Array.isArray(testcaseData) ? testcaseData : [testcaseData];
                const stackTrace = (testcaseData.length ? testcaseData.join('') : '').trim();
                core.info(`stackTrace: ${stackTrace}`)
                const message = (
                    (testcase.failure &&
                        testcase.failure._attributes &&
                        testcase.failure._attributes.message) ||
                    (testcase.flakyFailure &&
                        testcase.flakyFailure._attributes &&
                        testcase.flakyFailure._attributes.message) ||
                    (testcase.error &&
                        testcase.error._attributes &&
                        testcase.error._attributes.message) ||
                    stackTrace.split('\n').slice(0, 2).join('\n')
                ).trim();
                core.info(`message: ${message}`)

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
        core.info(JSON.stringify({count, skipped, annotations}));
        if (c == 0) continue;
        count += c;
        skipped += s;
        annotations = annotations.concat(a);
    }
    return { count, skipped, annotations };
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };
