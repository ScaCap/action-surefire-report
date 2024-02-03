package action.surefire.report.twin.second;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

import org.junit.Test;

public class TwinTest {

  @Test
  public void should_always_fail() {
    Twin evilTwin = new Twin();
    assertThat(evilTwin.getName(), equalTo("Good Twin"));
  }

}
