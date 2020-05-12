const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');
var parseString = require('xml2js').parseStringPromise;
const { resolveFileAndLine, resolvePath } = require('./utils.js');

(async () => {
    try {
        const reportPaths = core.getInput('report_paths');
        core.info(`Going to parse results form ${reportPaths}`)
        const githubToken = core.getInput('github_token');
        
        const globber = await glob.create(reportPaths, {followSymbolicLinks: false});
        let annotations = [];
        let count = 0;
        let skipped = 0;

        for await (const file of globber.globGenerator()) {
            core.debug(`Parsing file ${file}`);
            const data = await fs.promises.readFile(file);
            var json = await parseString(data);
        
            for (let testCase of json.testsuite.testcase) {
                count++;
                if (testCase.skipped) skipped++;
                if (testCase.failure || testCase.error) {
                    let message = testCase.failure && testCase.failure[0]['_'] || testCase.error[0]['_'];
                    let {filename, line} = resolveFileAndLine(message);
                    const path = await resolvePath(filename);
                    core.debug(`${path}:line | ${message}`)
                    annotations.push({
                        path,
                        start_line: line,
                        end_line: line,
                        start_column: 0,
                        end_column: 0,
                        annotation_level: 'failure',
                        message,
                    });
                }
            }
        }

        core.info(annotations);
        
        const createCheckRequest = {
            ...github.context.repo,
            name: 'Test Report',
            head_sha: github.context.payload.pull_request.head.sha,
            status: 'completed',
            conclusion: annotations.length === 0 ? 'success' : 'failure',
            output: {
                title: `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`,
                summary: "",
                annotations: annotations
            }
        }
        core.info(createCheckRequest);

        const octokit = new github.GitHub(githubToken);
        await octokit.checks.create(createCheckRequest);
    } catch(error) {
        core.setFailed(error.message);
    }
})();