const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
var parseString = require('xml2js').parseStringPromise;

const resolveFileAndLine = output => {
    const matches = output.match(/\(.*?:\d+\)/g);
    if (!matches) return { filename: "unknown", line: 1 };
    const [lastItem] = matches.slice(-1);
    const [filename, line] = lastItem.slice(1, -1).split(':');
    core.debug(`Resolved file ${filename} and line ${line}`);
    
    return { filename, line: parseInt(line) };
};

const resolvePath = async filename => {
    core.debug(`Resolving path for ${filename}`);
    const globber = await glob.create(`**/${filename}`, { followSymbolicLinks: false });
    const results = await globber.glob();
    core.debug(results);
    
    const path = results.length ? results[0].slice(__dirname.length + 1) : filename;
    core.debug(`Resolved path: ${path}`);
    
    return path;
};

async function parseFile(file) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);
    const json = await parseString(data);

    for (const testCase of json.testsuite.testcase) {
        count++;
        if (testCase.skipped) skipped++;
        if (testCase.failure || testCase.error) {
            const message =
                (testCase.failure && testCase.failure[0]['_']) || testCase.error[0]['_'];
            const { filename, line } = resolveFileAndLine(message);
            const path = await resolvePath(filename);
            core.info(`${path}:${line} | ${message.trim().split('\n')[0]}`);
            
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

module.exports = { resolveFileAndLine, resolvePath, parseFile };
