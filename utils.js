const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const parser = require('xml-js');

const resolveFileAndLine = (classname, output) => {
    const filename = classname.split('.').slice(-1)[0];
    const matches = output.match(new RegExp(`\\(${filename}.*?:\\d+\\)`, 'g'));
    if (!matches) return { filename: filename, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.slice(1, -1).split(':');
    core.debug(`Resolved file ${filename} and line ${line}`);

    return { filename, line: parseInt(line) };
};

const resolvePath = async filename => {
    core.debug(`Resolving path for ${filename}`);
    const globber = await glob.create(`**/${filename}.*`, { followSymbolicLinks: false });
    const results = await globber.glob();
    core.debug(`Matched files: ${results}`);
    const searchPath = globber.getSearchPaths()[0];
    const path = results.length ? results[0].slice(searchPath.length + 1) : filename;
    core.debug(`Resolved path: ${path}`);

    return path;
};

async function parseFile(file) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);
    const xml = JSON.parse(parser.xml2json(data, { compact: true }));
    const testsuite = (xml && xml.testsuite) || {};

    const testcases = typeof testsuite.testcase == 'undefined'
        ? []
        : Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : [testsuite.testcase];

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
                (testcase.failure && testcase.failure._attributes.message) ||
                (testcase.error && testcase.error._attributes.message) ||
                stackTrace.split('\n').slice(0, 2).join('\n')
            ).trim();

            const { filename, line } = resolveFileAndLine(
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
    return { count, skipped, annotations };
}

const parseTestReports = async reportPaths => {
    const globber = await glob.create(reportPaths, { followSymbolicLinks: false });
    let annotations = [];
    let count = 0;
    let skipped = 0;
    for await (const file of globber.globGenerator()) {
        const { count: c, skipped: s, annotations: a } = await parseFile(file);
        count += c;
        skipped += s;
        annotations = annotations.concat(a);
    }
    return { count, skipped, annotations };
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };
