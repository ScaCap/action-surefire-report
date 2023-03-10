const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const libxmljs = require("libxmljs");

const resolveFileAndLine = (file, classname, output, isFilenameInOutput) => {
    // extract filename from classname and remove suffix
    let filename;
    let filenameWithPackage;
    if (isFilenameInOutput) {
        filename = output.split(':')[0].trim();
        filenameWithPackage = filename
    } else {
        filename = file ? file : classname.split('.').slice(-1)[0].split('(')[0];
        filenameWithPackage = classname.replace(/\./g, "/");
    }
    const matches = output.match(new RegExp(`${filename}.*?:\\d+`, 'g'));
    if (!matches) return { filename: filename, filenameWithPackage: filenameWithPackage, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.split(':');
    core.debug(`Resolved file ${filenameWithPackage} with name ${filename} and line ${line}`);

    return { filename, filenameWithPackage, line: parseInt(line) };
};

const resolvePath = async filenameWithPackage => {
    if (!filenameWithPackage) {
        return '';
    }
    core.debug(`Resolving path for ${filenameWithPackage}`);
    const globber = await glob.create([`**/${filenameWithPackage}.*`, `**/${filenameWithPackage}`].join('\n'), { followSymbolicLinks: false });
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

async function parseFile(file, isFilenameInStackTrace) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);

    const report = libxmljs.parseXml(data + "", {huge: true});
    const testsuites = report.find('//testsuite');

    for (const testsuite of testsuites) {
        const testcases = testsuite.find('testcase');
        for (const testcase of testcases) {
            count++;
            skipped += testcase.find('skipped').length;
            let failures = testcase.find('failure | flakyFailure | error');
            if (failures.length == 0) {
                continue;
            }
            const stackTrace = failures.map(failure => failure.text()).join('').trim();
            const message = (
                failures.map(failure => failure.attr('message')?.value()).join('') ||
                stackTrace.split('\n').slice(0, 2).join('\n')
            ).trim();

            const { filename, filenameWithPackage, line } = resolveFileAndLine(
                testcase.attr('file')?.value() || '',
                testcase.attr('classname')?.value() || '',
                stackTrace,
                isFilenameInStackTrace
            );

            const path = await resolvePath(filenameWithPackage);
            const title = `${filename}.${testcase.attr('name')?.value()}`;
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
    return { count, skipped, annotations };
}

const parseTestReports = async (reportPaths, isFilenameInStackTrace) => {
    const globber = await glob.create(reportPaths, { followSymbolicLinks: false });
    let annotations = [];
    let count = 0;
    let skipped = 0;
    for await (const file of globber.globGenerator()) {
        const { count: c, skipped: s, annotations: a } = await parseFile(file, isFilenameInStackTrace);
        if (c === 0) continue;
        count += c;
        skipped += s;
        annotations = annotations.concat(a);
    }
    return { count, skipped, annotations };
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };
