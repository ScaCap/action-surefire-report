const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const { parseFile } = require('./utils.js');

(async () => {
    try {
        const reportPaths = core.getInput('report_paths');
        core.info(`Going to parse results form ${reportPaths}`);
        const githubToken = core.getInput('github_token');

        const globber = await glob.create(reportPaths, { followSymbolicLinks: false });
        let annotations = [];
        let count = 0;
        let skipped = 0;

        for await (const file of globber.globGenerator()) {
            const { count: c, skipped: s, annotations: a } = await parseFile(file);
            count += c;
            skipped += s;
            annotations.concat(a);
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
                summary: '',
                annotations: annotations
            }
        };
        core.info(createCheckRequest);

        const octokit = new github.GitHub(githubToken);
        await octokit.checks.create(createCheckRequest);
    } catch (error) {
        core.setFailed(error.message);
    }
})();
