const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');
var parseString = require('xml2js').parseStringPromise;

(async () => {
    try {
        console.log(JSON.stringify(github.context));

        const reportPaths = core.getInput('report_paths') || '**/surefire-reports/TEST-*.xml';
        console.log(`Going to parse results form ${reportPaths}`)
        const githubToken = core.getInput('github_token');
        
        const globber = await glob.create(reportPaths, {followSymbolicLinks: false});
        let annotations = [];
        let count = 0;
        let skipped = 0;

        for await (const file of globber.globGenerator()) {
            console.log(`Parsing file ${file}`);
            const data = await fs.promises.readFile(file);
            var json = await parseString(data);
        
            for (let testCase of json.testsuite.testcase) {
                count++;
                if (testCase.skipped) skipped++;
                if (testCase.failure) {
                    let file = testCase['$'].classname.replace(/$.*/g, '').replace(/\./g, '/');
                    let failure = testCase.failure[0]['_'];

                    annotations.push({
                        path: `commons-scheduling/src/test/java/${file}.java`,
                        start_line: 42,
                        end_line: 42,
                        start_column: 0,
                        end_column: 0,
                        annotation_level: 'failure',
                        message: failure,
                    });
                }
            }
        }

        console.log(annotations);
        
        const createCheckRequest = {
            ...github.context.repo,
            name: 'Report Tests',
            head_sha: github.context.payload.pull_request.head.sha,
            status: 'completed',
            conclusion: annotations.length === 0 ? 'success' : 'failure',
            output: {
                title: `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`,
                summary: "",
                annotations: annotations
            }
        }
        console.log(createCheckRequest);

        const octokit = new github.GitHub(githubToken);
        await octokit.checks.create(createCheckRequest);
    } catch(error) {
        core.setFailed(error.message);
    }
})();