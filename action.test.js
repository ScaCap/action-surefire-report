const core = require('@actions/core');
const github = require('@actions/github');
const nock = require('nock');
const action = require('./action');
const {
    finishedWithFailures,
    finishedSuccess,
    nothingFound,
    nothingFoundButSuccess,
    masterSuccess
} = require('./action.test.fixtures');

jest.setTimeout(20000);

let inputs = {};
let outputs = {};
let failed = null;

describe('action should work', () => {
    beforeAll(() => {
        // https://github.com/actions/checkout/blob/v2.1.0/__test__/input-helper.test.ts
        jest.spyOn(core, 'getInput').mockImplementation(name => {
            return inputs[name];
        });

        jest.spyOn(core, 'setOutput').mockImplementation((name, value) => {
            outputs[name] = value;
        });

        jest.spyOn(core, 'setFailed').mockImplementation(reason => {
            failed = reason;
        });

        jest.spyOn(core, 'error').mockImplementation(jest.fn());
        jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        jest.spyOn(core, 'info').mockImplementation(jest.fn());
        jest.spyOn(core, 'debug').mockImplementation(jest.fn());

        github.context.payload.pull_request = {
            html_url: 'https://github.com/scacap/action-surefire-report',
            head: { sha: 'sha123' }
        };

        jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
            return {
                owner: 'scacap',
                repo: 'action-surefire-report'
            };
        });
    });

    beforeEach(() => {
        // Reset inputs
        inputs = {
            report_paths: '**/surefire-reports/TEST-*.xml, **/failsafe-reports/TEST-*.xml',
            github_token: 'GITHUB_TOKEN',
            check_name: 'Test Report',
            fail_if_no_tests: 'true'
        };

        // Reset outputs
        outputs = {};
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('should parse surefire reports and send a check run to GitHub', async () => {
        let request = null;
        const scope = nock('https://api.github.com')
            .post('/repos/scacap/action-surefire-report/check-runs', body => {
                request = body;
                return body;
            })
            .reply(200, {});
        await action();
        scope.done();

        expect(request).toStrictEqual(finishedWithFailures);
        expect(outputs).toHaveProperty('conclusion', 'failure');
        expect(failed).toBeNull();
    });

    it('should send all ok if no tests were broken', async () => {
        inputs.report_paths = '**/surefire-reports/TEST-*AllOkTest.xml';
        let request = null;
        const scope = nock('https://api.github.com')
            .post('/repos/scacap/action-surefire-report/check-runs', body => {
                request = body;
                return body;
            })
            .reply(200, {});
        await action();
        scope.done();

        expect(request).toStrictEqual(finishedSuccess);
        expect(outputs).toHaveProperty('conclusion', 'success');
        expect(failed).toBeNull();
    });

    it('should send failure if no test results were found', async () => {
        inputs.report_paths = '**/xxx/*.xml';
        let request = null;
        const scope = nock('https://api.github.com')
            .post('/repos/scacap/action-surefire-report/check-runs', body => {
                request = body;
                return body;
            })
            .reply(200, {});
        await action();
        scope.done();

        expect(request).toStrictEqual(nothingFound);
        expect(outputs).toHaveProperty('conclusion', 'failure');
    });

    it('should send OK if no test results were found and fail_if_no_tests is false', async () => {
        inputs.report_paths = '**/xxx/*.xml';
        inputs.fail_if_no_tests = 'false';
        let request = null;
        const scope = nock('https://api.github.com')
            .post('/repos/scacap/action-surefire-report/check-runs', body => {
                request = body;
                return body;
            })
            .reply(200, {});
        await action();
        scope.done();

        expect(request).toStrictEqual(nothingFoundButSuccess);
        expect(outputs).toHaveProperty('conclusion', 'success');
    });

    it('should send reports to sha if no pr detected', async () => {
        inputs.report_paths = '**/surefire-reports/TEST-*AllOkTest.xml';
        github.context.payload.pull_request = undefined;
        github.context.sha = 'masterSha123';
        github.context.ref = 'refs/heads/master';

        let request = null;
        const scope = nock('https://api.github.com')
            .post('/repos/scacap/action-surefire-report/check-runs', body => {
                request = body;
                return body;
            })
            .reply(200, {});
        await action();
        scope.done();

        expect(request).toStrictEqual(masterSuccess);
    });

    describe('with option fail_on_test_failures', () => {
        it('should not fail on success', async () => {
            inputs.report_paths = '**/surefire-reports/TEST-*AllOkTest.xml';

            const scope = nock('https://api.github.com')
                .post('/repos/scacap/action-surefire-report/check-runs')
                .reply(200, {});

            inputs['fail_on_test_failures'] = 'true';
            await action();
            scope.done();

            expect(failed).toBeNull();
        });

        it('should fail on failures', async () => {
            const scope = nock('https://api.github.com')
                .post('/repos/scacap/action-surefire-report/check-runs')
                .reply(200, {});

            inputs['fail_on_test_failures'] = 'true';
            await action();
            scope.done();

            expect(failed).toBe('There were 11 failed tests');
        });
    });
});
