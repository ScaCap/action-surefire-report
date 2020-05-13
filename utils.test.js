const { resolveFileAndLine, resolvePath, parseFile } = require('./utils.js');

describe('resolveFileAndLine', () => {
    it('should default to 1 if no line found', () => {
        const { filename, line } = resolveFileAndLine(`not a stacktrace`);
        expect(filename).toBe('unknown');
        expect(line).toBe(1);
    });

    it('should parse correctly filename and line for a Java file', () => {
        const { filename, line } = resolveFileAndLine(`
action.surefire.report.email.InvalidEmailAddressException: Invalid email address 'user@ñandú.com.ar'
    at action.surefire.report.email.EmailAddressTest.expectException(EmailAddressTest.java:74)
    at action.surefire.report.email.EmailAddressTest.shouldNotContainInternationalizedHostNames(EmailAddressTest.java:39)
        `);
        expect(filename).toBe('EmailAddressTest.java');
        expect(line).toBe(39);
    });

    it('should parse correctly filename and line for a Kotlin file', () => {
        const { filename, line } = resolveFileAndLine(`
java.lang.AssertionError: unexpected exception type thrown; expected:<java.lang.IllegalStateException> but was:<java.lang.IllegalArgumentException>
    at action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)
Caused by: java.lang.IllegalArgumentException: Amount must have max 2 non-zero decimal places
    at action.surefire.report.calc.CalcUtilsTest.scale(CalcUtilsTest.kt:31)
    at action.surefire.report.calc.CalcUtilsTest.access$scale(CalcUtilsTest.kt:9)
    at action.surefire.report.calc.CalcUtilsTest.test error handling(CalcUtilsTest.kt:27)
        `);
        expect(filename).toBe('CalcUtilsTest.kt');
        expect(line).toBe(27);
    });
});

describe('resolvePath', () => {
    it('should find correct file for Java filename', async () => {
        const path = await resolvePath('EmailAddressTest.java');
        expect(path).toBe(
            'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java'
        );
    });

    it('should find correct file for Kotlin filename', async () => {
        const path = await resolvePath('CalcUtilsTest.kt');
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
        ]);
    });
});
