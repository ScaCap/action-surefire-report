package action.surefire.report.calc;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.MatcherAssert.assertThat;

public class StringUtilsTest {

    @Rule
    public ExpectedException thrown = ExpectedException.none();

    @Test
    public void require() {
        final String output = StringUtils.requireNotBlank("hello");
        assertThat(output, equalTo("hello"));
    }

    @Test
    public void require_fail() {
        thrown.expect(IllegalArgumentException.class);
        thrown.expectMessage("This is unexpected");
        StringUtils.requireNotBlank("");
    }

    @Test
    public void require_failMsg() {
        thrown.expect(IllegalArgumentException.class);
        thrown.expectMessage("I really need that input");
        StringUtils.requireNotBlank("", "I really need that input");
    }

    @Test
    public void require_fail_null() {
        thrown.expect(IllegalArgumentException.class);
        thrown.expectMessage("Input='null' didn't match condition.");
        StringUtils.requireNotBlank(null);
    }

    @Test
    public void require_withNullMsg() {
        thrown.expect(IllegalArgumentException.class);
        thrown.expectMessage("Input='' didn't match condition.");
        StringUtils.requireNotBlank("");
    }
}