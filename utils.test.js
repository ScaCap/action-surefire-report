const { resolveFileAndLine, resolvePath, parseFile } = require('./utils');

describe('resolveFileAndLine', () => {
    it('should default to 1 if no line found', () => {
        const { filename, line } = resolveFileAndLine('someClassName', 'not a stacktrace');
        expect(filename).toBe('someClassName');
        expect(line).toBe(1);
    });

    it('should parse correctly filename and line for a Java file', () => {
        const { filename, line } = resolveFileAndLine('action.surefire.report.email.EmailAddressTest', `
action.surefire.report.email.InvalidEmailAddressException: Invalid email address 'user@ñandú.com.ar'
    at action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)
    at action.surefire.report.email.EmailAddressTest.shouldNotContainInternationalizedHostNames(EmailAddressTest.java:39)
        `);
        expect(filename).toBe('EmailAddressTest');
        expect(line).toBe(39);
    });

    it('should parse correctly filename and line for a Kotlin file', () => {
        const { filename, line } = resolveFileAndLine('action.surefire.report.calc.CalcUtilsTest', `
java.lang.AssertionError: unexpected exception type thrown; expected:<java.lang.IllegalStateException> but was:<java.lang.IllegalArgumentException>
    at action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)
Caused by: java.lang.IllegalArgumentException: Amount must have max 2 non-zero decimal places
    at action.surefire.report.calc.CalcUtilsTest.scale(CalcUtilsTest.kt:31)
    at action.surefire.report.calc.CalcUtilsTest.access$scale(CalcUtilsTest.kt:9)
    at action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)
        `);
        expect(filename).toBe('CalcUtilsTest');
        expect(line).toBe(27);
    });
});

describe('resolvePath', () => {
    it('should find correct file for Java filename', async () => {
        const path = await resolvePath('EmailAddressTest');
        expect(path).toBe(
            'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java'
        );
    });

    it('should find correct file for Kotlin filename', async () => {
        const path = await resolvePath('CalcUtilsTest');
        expect(path).toBe('tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt');
    });
});

describe('parseFile', () => {
    it('should parse CalcUtils results', async () => {
        const { count, skipped, annotations } = await parseFile(
            'tests/utils/target/surefire-reports/TEST-action.surefire.report.calc.CalcUtilsTest.xml'
        );
        expect(count).toBe(2);
        expect(skipped).toBe(0);
        expect(annotations).toStrictEqual([
            {
                path: 'tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt',
                start_line: 27,
                end_line: 27,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    'unexpected exception type thrown; expected:<java.lang.IllegalStateException> but was:<java.lang.IllegalArgumentException>'
            },
            {
                path: 'tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt',
                start_line: 15,
                end_line: 15,
                start_column: 0,
                end_column: 0,
                annotation_level: 'failure',
                message:
                    '\nExpected: <100.10>\n     but: was <100.11>'
            }
        ]);
    });
});
