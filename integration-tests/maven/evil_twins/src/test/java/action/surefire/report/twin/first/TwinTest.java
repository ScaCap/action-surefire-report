package action.surefire.report.twin.first;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

import org.junit.Test;

public class TwinTest {

  @Test
  public void should_always_pass() {
    Twin goodTwin = new Twin();
    assertThat(goodTwin.getName(), equalTo("Good Twin"));
  }

}
