package action.surefire.report.calc;

import org.junit.Test;

import static org.junit.Assert.assertTrue;

public class AllOkWithFlakesTest {

    private static boolean failTest = true;

    @Test
    public void firstTryFailSecondTrySuccess() {
        if(failTest) {
            failTest = false;
            assertTrue(false);
        } else {
            assertTrue(true);
        }
    }
}
