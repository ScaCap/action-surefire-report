const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const parser = require('xml-js');

const resolveFileAndLine = (file, classname, output, isFilenameInOutput) => {
    // extract filename from classname and remove suffix
    let filename;
    let filenameWithPackage;
    if (isFilenameInOutput) {
        filename = output.split(':')[0].trim();
        filenameWithPackage = filename;
    } else {
        filename = file ? file : classname.split('.').slice(-1)[0].split('(')[0];
        filenameWithPackage = classname.replace(/\./g, '/');
    }
    const matches = output.match(new RegExp(`${filename}.*?:\\d+`, 'g'));
    if (!matches) return {filename: filename, filenameWithPackage: filenameWithPackage, line: 1};

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.split(':');
    core.debug(`Resolved file ${filenameWithPackage} with name ${filename} and line ${line}`);

    return {filename, filenameWithPackage, line: parseInt(line)};
};

const resolvePath = async filenameWithPackage => {
    core.debug(`Resolving path for ${filenameWithPackage}`);
    const globber = await glob.create([`**/${filenameWithPackage}.*`, `**/${filenameWithPackage}`].join('\n'), {followSymbolicLinks: false});
    const results = await globber.glob();
    core.debug(`Matched files: ${results}`);
    const searchPath = globber.getSearchPaths()[0];

    let path = '';
    if (results.length) {
        // skip various temp folders
        const found = results.find(r => !r.includes('__pycache__') && !r.endsWith('.class'));
        if (found) path = found.slice(searchPath.length + 1);
        else path = filenameWithPackage;
    } else {
        path = filenameWithPackage;
    }
    core.debug(`Resolved path: ${path}`);

    // canonicalize to make windows paths use forward slashes
    const canonicalPath = path.replace(/\\/g, '/');
    core.debug(`Canonical path: ${canonicalPath}`);

    return canonicalPath;
};

function getTestsuites(report) {
    if (report.testsuite) {
        return [report.testsuite];
    }
    if (!report.testsuites || !report.testsuites.testsuite) {
        return [];
    }
    if (Array.isArray(report.testsuites.testsuite)) {
        return report.testsuites.testsuite;
    }
    return [report.testsuites.testsuite];
}

async function parseFile(file, isFilenameInStackTrace, ignoreFlakyTests) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);

    const report = JSON.parse(parser.xml2json(data, {compact: true}));
    core.debug(`parsed report: ${JSON.stringify(report)}`);

    const testsuites = getTestsuites(report);
    core.debug(`test suites: ${JSON.stringify(testsuites)}`);

    for (const testsuite of testsuites) {
        const testcases = Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : testsuite.testcase
                ? [testsuite.testcase]
                : [];
        for (const testcase of testcases) {
            count++;
            if (testcase.skipped) skipped++;
            if (testcase.failure || (testcase.flakyFailure && !ignoreFlakyTests) || testcase.error) {
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
                    stackTrace.split('\n').slice(0, 2).join('\n') ||
                    testcase._attributes.name
                ).trim();

                const {filename, filenameWithPackage, line} = resolveFileAndLine(
                    testcase._attributes.file,
                    testcase._attributes.classname,
                    stackTrace,
                    isFilenameInStackTrace
                );

                const path = await resolvePath(filenameWithPackage);
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
    return {count, skipped, annotations};
}

const parseTestReports = async (reportPaths, isFilenameInStackTrace, ignoreFlakyTests) => {
    const globber = await glob.create(reportPaths, {followSymbolicLinks: false});
    let annotations = [];
    let count = 0;
    let skipped = 0;
    for await (const file of globber.globGenerator()) {
        const {count: c, skipped: s, annotations: a} = await parseFile(file, isFilenameInStackTrace, ignoreFlakyTests);
        if (c === 0) continue;
        count += c;
        skipped += s;
        annotations = annotations.concat(a);
    }
    return {count, skipped, annotations};
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };
