const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");
const { retry } = require("@octokit/plugin-retry");
const RetryingOctokit = Octokit.plugin(retry);
const { parseTestReports } = require('./utils.js');


const action = async () => {
    const reportPaths = core.getInput('report_paths').split(',').join('\n');
    core.info(`Going to parse results form ${reportPaths}`);
    const githubToken = core.getInput('github_token');
    const createCheck = (core.getInput('create_check') || 'true') === 'true';
    const name = core.getInput('check_name');
    const commit = core.getInput('commit');
    const failOnFailedTests = core.getInput('fail_on_test_failures') === 'true';
    const failIfNoTests = core.getInput('fail_if_no_tests') === 'true';
    const ignoreFlakyTests = core.getInput('ignore_flaky_tests') === 'true';
    const skipPublishing = core.getInput('skip_publishing') === 'true';
    const isFilenameInStackTrace = core.getInput('file_name_in_stack_trace') === 'true';
    const githubBaseUrl = core.getInput('github_base_url');

    let { count, skipped, annotations } = await parseTestReports(reportPaths, isFilenameInStackTrace, ignoreFlakyTests);
    const foundResults = count > 0 || skipped > 0;
    const conclusion =
        (foundResults && annotations.length === 0) || (!foundResults && !failIfNoTests)
            ? 'success'
            : 'failure';

    function buildRetryingOctokitClient() {
        const baseRequest = { auth: githubToken, request: { retries: 3 } };

        if (githubBaseUrl){
            baseRequest.baseUrl = githubBaseUrl;
        }

        return new RetryingOctokit(baseRequest)
    }

    if (!skipPublishing) {
        const title = foundResults
            ? `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`
            : 'No test results found!';
        core.info(`Result: ${title}`);

        const pullRequest = github.context.payload.pull_request;
        const link = (pullRequest && pullRequest.html_url) || github.context.ref;
        const status = 'completed';
        const head_sha = commit || (pullRequest && pullRequest.head.sha) || github.context.sha;

        const octokit = buildRetryingOctokitClient();
        if (createCheck) {
            core.info(`Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${head_sha})`);
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

            await octokit.rest.checks.create(createCheckRequest);
        } else {
            const { data: {check_runs: check_runs} } = await octokit.rest.checks.listForRef({
                ...github.context.repo,
                check_name: name,
                ref: head_sha,
                status: 'in_progress'
            })
            core.debug(JSON.stringify(check_runs, null, 2));
            if (check_runs.length === 0) {
                core.setFailed(`Did not find any in progress '${name}' check for sha ${head_sha}`);
                return;
            }
            if (check_runs.length !== 1) {
                core.setFailed(`Found multiple in progress '${name}' checks for sha ${head_sha}`);
                return;
            }
            const check_run = check_runs[0];
            core.info(`Patching '${name}' check for ${link} (sha: ${head_sha})`);
            const updateCheckRequest = {
                ...github.context.repo,
                check_run_id: check_run.id,
                output: {
                    title: check_run.output.title || title,
                    summary: check_run.output.summary || '',
                    annotations: annotations.slice(0, 50)
                }
            };

            core.debug(JSON.stringify(updateCheckRequest, null, 2));

            await octokit.rest.checks.update(updateCheckRequest);
        }
    } else {
        core.info('Not publishing test result due to skip_publishing=true');
    }

    // make conclusion consumable by downstream actions
    core.setOutput('conclusion', conclusion);

    // optionally fail the action if tests fail
    if (failOnFailedTests && conclusion !== 'success') {
        core.setFailed(`There were ${annotations.length} failed tests`);
    }
};

module.exports = action;
