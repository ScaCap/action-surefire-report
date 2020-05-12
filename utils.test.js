const { resolveFileAndLine, resolvePath, parseFile } = require('./utils.js');

test('defaults to 1 if no line found', () => {
    const { file, line } = resolveFileAndLine(`not a stacktrace`);
    expect(file).toBe(undefined);
    expect(line).toBe(1);
});

test('parses correct line for Java file', () => {
    const { file, line } = resolveFileAndLine(`
        InvalidEmailAddressException: Invalid email address 'user@ñandú.com.ar'

            at EmailAddress.<init>(EmailAddress.java:107)
            at EmailAddress.of(EmailAddress.java:90)
            at EmailAddressTest.expectException(EmailAddressTest.java:132)
            at EmailAddressTest.shouldNotContainInternationalizedHostNames(EmailAddressTest.java:45)
    `);
    expect(file).toBe('EmailAddressTest.java');
    expect(line).toBe(45);
});

test('parses correct line for Kotlin file', () => {
    const { file, line } = resolveFileAndLine(`
        java.lang.AssertionError: 

        Expecting message:
         <"Wrong message here!">
        but was:
         <"This exception is dangerous!">
        at ExceptionTest.method without proper arguments should fail(ExceptionTest.kt:104)
    `);
    expect(file).toBe('ExceptionTest.kt');
    expect(line).toBe(104);
});

test('find correct file for java class', async () => {
    const path = await resolvePath('EmailAddressTest.java');
    expect(path).toBe(
        'tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java'
    );
});

test('find correct file for Kotlin class', async () => {
    const path = await resolvePath('CalcUtilsTest.kt');
    expect(path).toBe('tests/utils/src/test/java/action/surefire/report/calc/CalcUtilsTest.kt');
});

test('should parse CalcUtils results', async () => {
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
