const core = require('@actions/core');
const github = require('@actions/github');
const { parseTestReports } = require('./utils.js');

const action = async () => {
    const reportPaths = core.getInput('report_paths');
    core.info(`Going to parse results form ${reportPaths}`);
    const githubToken = core.getInput('github_token');
    const name = core.getInput('check_name');

    let { count, skipped, annotations } = await parseTestReports(reportPaths);
    annotations = annotations.length > 50 ? annotations.slice(0, 50) : annotations;
    const foundResults = count > 0 || skipped > 0;
    const title = foundResults
        ? `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`
        : 'No test results found!';
    core.info(`Result: ${title}`);

    const prLink = github.context.payload.pull_request.html_url;
    const conclusion = foundResults && annotations.length === 0 ? 'success' : 'failure';
    const status = 'completed';
    const head_sha = github.context.payload.pull_request.head.sha;
    core.info(
        `Posting status '${status}' with conclusion '${conclusion}' to ${prLink} (sha: ${head_sha})`
    );

    const createCheckRequest = {
        ...github.context.repo,
        name,
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
    await octokit.checks.create(createCheckRequest);
};

module.exports = action;
