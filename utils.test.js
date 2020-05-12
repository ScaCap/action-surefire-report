const { resolveFileAndLine, resolvePath } = require('./utils.js')

test('defaults to 1 if no line found', () => {
    const { file, line } = resolveFileAndLine(`not a stacktrace`)
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
    `)
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
    `)
    expect(file).toBe('ExceptionTest.kt');
    expect(line).toBe(104);
});

test('find correct file', async () => {
   const path = await resolvePath('EmailAddressTest.java');
    expect(path).toBe('tests/email/src/test/java/action/surefire/report/email/EmailAddressTest.java');
});
