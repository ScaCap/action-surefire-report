const core = require('@actions/core');
const github = require('@actions/github');
const { parseTestReports } = require('./utils.js');

const action = async () => {
    const reportPaths = core.getInput('report_paths').split(',').join('\n');
    core.info(`Going to parse results form ${reportPaths}`);
    const githubToken = core.getInput('github_token');
    const name = core.getInput('check_name');
    const commit = core.getInput('commit');
    const failOnFailedTests = core.getInput('fail_on_test_failures') === 'true';
    const failIfNoTests = core.getInput('fail_if_no_tests') === 'true';

    let { count, skipped, annotations } = await parseTestReports(reportPaths);
    const foundResults = count > 0 || skipped > 0;
    const title = foundResults
        ? `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`
        : 'No test results found!';
    core.info(`Result: ${title}`);

    const pullRequest = github.context.payload.pull_request;
    const link = (pullRequest && pullRequest.html_url) || github.context.ref;
    const conclusion =
        (foundResults && annotations.length === 0) || (!foundResults && !failIfNoTests)
            ? 'success'
            : 'failure';
    const status = 'completed';
    const head_sha = commit || (pullRequest && pullRequest.head.sha) || github.context.sha;
    core.info(
        `Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${head_sha})`
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
            annotations: annotations.slice(0, 50)
        }
    };

    core.debug(JSON.stringify(createCheckRequest, null, 2));

    // make conclusion consumable by downstream actions
    core.setOutput('conclusion', conclusion);

    const octokit = new github.GitHub(githubToken);
    await octokit.checks.create(createCheckRequest);

    // optionally fail the action if tests fail
    if (failOnFailedTests && conclusion !== 'success') {
        core.setFailed(`There were ${annotations.length} failed tests`);
    }
};

module.exports = action;
