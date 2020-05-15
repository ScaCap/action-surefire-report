const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const { parseFile } = require('./utils.js');

(async () => {
    try {
        console.log(JSON.stringify(github.context));
        
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
            annotations = annotations.concat(a);
        }

        const title = `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`;
        core.info(`Result: ${title}`);

        const prLink = github.context.payload.pull_request.html_url;
        const conclusion = annotations.length === 0 ? 'success' : 'failure';
        const status = 'completed';
        const head_sha = github.context.payload.pull_request.head.sha;
        core.info(
            `Posting status '${status}' with conclusion '${conclusion}' to ${prLink} (sha: ${head_sha})`
        );

        const createCheckRequest = {
            ...github.context.repo,
            name: 'Test Report',
            head_sha,
            status,
            conclusion,
            output: {
                title,
                summary: '',
                annotations
            }
        };

        core.debug(JSON.stringify(createCheckRequest, null, 2));

        const octokit = new github.GitHub(githubToken);
        const res = await octokit.checks.listSuitesForRef({
            ...github.context.repo,
            ref: head_sha
        });
        core.info(JSON.stringify(res));
        for (const suite of res.data.check_suites) {
            const res2 = await octokit.checks.listForSuite({
                ...github.context.repo,
                check_suite_id: suite.id
            });
            core.info(JSON.stringify(res2));
        }

        await octokit.checks.create(createCheckRequest);
    } catch (error) {
        core.setFailed(error.message);
    }
})();
