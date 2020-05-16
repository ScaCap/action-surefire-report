const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const xml2js = require('xml2js');

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
    const json = await xml2js.parseStringPromise(data);

    for (const testCase of json.testsuite.testcase) {
        count++;
        if (testCase.skipped) skipped++;
        if (testCase.failure || testCase.error) {
            const stackTrace =
                (testCase.failure && testCase.failure[0]['_']) || testCase.error[0]['_'];
            const message =
                (testCase.failure && testCase.failure[0]['$'].message) || testCase.error[0]['$'].message;
            const { filename, line } = resolveFileAndLine(testCase['$'].classname, stackTrace);
            const path = await resolvePath(filename);
            core.info(`${path}:${line} | ${stackTrace.trim().split('\n')[0]}`);

            annotations.push({
                path,
                start_line: line,
                end_line: line,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message
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
