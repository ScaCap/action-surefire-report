const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const fs = require('fs');
var parseString = require('xml2js').parseStringPromise;

(async () => {
    try {
        const reportPaths = core.getInput('report_paths') || '**/surefire-reports/TEST-*.xml';
        core.info(`Going to parse results form ${reportPaths}`)
        const githubToken = core.getInput('github_token');
        
        const globber = await glob.create(reportPaths, {followSymbolicLinks: false});
        let annotations = [];
        let count = 0;
        let skipped = 0;

        for await (const file of globber.globGenerator()) {
            core.info(`Parsing file ${file}`);
            const repoName = github.context.payload.repository.name;
            const folder = file.substring(file.lastIndexOf(repoName) + 2, file.lastIndexOf("/target"));
            core.info(`Going to attribute this file to folder ${folder}`)
            const data = await fs.promises.readFile(file);
            var json = await parseString(data);
        
            for (let testCase of json.testsuite.testcase) {
                count++;
                if (testCase.skipped) skipped++;
                if (testCase.failure) {
                    let file = testCase['$'].classname.replace(/$.*/g, '').replace(/\./g, '/');
                    let failure = testCase.failure[0]['_'];

                    annotations.push({
                        path: `${folder}/src/test/java/${file}.java`,
                        start_line: 1,
                        end_line: 1,
                        start_column: 0,
                        end_column: 0,
                        annotation_level: 'failure',
                        message: failure,
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