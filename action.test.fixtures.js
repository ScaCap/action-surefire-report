const finishedWithFailures = {
    name: 'Test Report',
    head_sha: 'sha123',
    status: 'completed',
    conclusion: 'failure',
    output: {
        title: '16 tests run, 0 skipped, 9 failed.',
        summary: '',
        annotations: [
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 39,
                end_line: 39,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    "action.surefire.report.email.InvalidEmailAddressException: Invalid email address 'user@ñandú.com.ar'\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)\n\tat action.surefire.report.email.EmailAddressTest.shouldNotContainInternationalizedHostNames(EmailAddressTest.java:39)\n"
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 49,
                end_line: 49,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    "action.surefire.report.email.InvalidEmailAddressException: Invalid email address 'Abc\\@def@example.com'\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)\n\tat action.surefire.report.email.EmailAddressTest.shouldBeStricterThanRfc2821(EmailAddressTest.java:49)\n"
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 57,
                end_line: 57,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'java.lang.AssertionError: Address aba@bab.com should have thrown InvalidEmailAddressException\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:75)\n\tat action.surefire.report.email.EmailAddressTest.shouldBeStricterThanRfc2822(EmailAddressTest.java:57)\n'
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 18,
                end_line: 18,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'action.surefire.report.email.InvalidEmailAddressException: Email address must not be null, empty, or blanks\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)\n\tat action.surefire.report.email.EmailAddressTest.shouldNotBeBlank(EmailAddressTest.java:18)\n'
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 32,
                end_line: 32,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    "action.surefire.report.email.InvalidEmailAddressException: Invalid email address 'user@host'\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)\n\tat action.surefire.report.email.EmailAddressTest.shouldNotContainLocalHosts(EmailAddressTest.java:32)\n"
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 25,
                end_line: 25,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'java.lang.AssertionError: Address user-without-host@test.com should have thrown InvalidEmailAddressException\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:75)\n\tat action.surefire.report.email.EmailAddressTest.shouldNotMissComponents(EmailAddressTest.java:25)\n'
            },
            {
                path:
                    'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java',
                start_line: 66,
                end_line: 66,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    "action.surefire.report.email.InvalidEmailAddressException: Invalid email address '.user@host.com'\n\tat action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)\n\tat action.surefire.report.email.EmailAddressTest.shouldNotAllowDotsInWeirdPlaces(EmailAddressTest.java:66)\n"
            },
            {
                path: 'tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt',
                start_line: 27,
                end_line: 27,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'java.lang.AssertionError: unexpected exception type thrown; expected:<java.lang.IllegalStateException> but was:<java.lang.IllegalArgumentException>\n\tat action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)\nCaused by: java.lang.IllegalArgumentException: Amount must have max 2 non-zero decimal places\n\tat action.surefire.report.calc.CalcUtilsTest.scale(CalcUtilsTest.kt:31)\n\tat action.surefire.report.calc.CalcUtilsTest.access$scale(CalcUtilsTest.kt:9)\n\tat action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)\n'
            },
            {
                path: 'tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt',
                start_line: 15,
                end_line: 15,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'java.lang.AssertionError: \n\nExpected: <100.10>\n     but: was <100.11>\n\tat action.surefire.report.calc.CalcUtilsTest.test scale(CalcUtilsTest.kt:15)\n'
            }
        ]
    }
};

const finishedSuccess = {
    name: 'Test Report',
    head_sha: 'sha123',
    status: 'completed',
    conclusion: 'success',
    output: {
        title: '5 tests run, 0 skipped, 0 failed.',
        summary: '',
        annotations: []
    }
};

const nothingFound = {
    name: 'Test Report',
    head_sha: 'sha123',
    status: 'completed',
    conclusion: 'failure',
    output: {
        title: 'No test results found!',
        summary: '',
        annotations: []
    }
};

module.exports = { finishedWithFailures, finishedSuccess, nothingFound };
