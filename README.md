# GitHub Action: Process maven surefire reports

![](https://github.com/scacap/action-surefire-report/workflows/build/badge.svg)


This action processes maven surefire or failsafe XML reports on pull requests and shows the result as a PR check with summary and annotations.

![Screenshot](./screenshot.png)

## Inputs

### `report_paths`

Optional. [Glob](https://github.com/actions/toolkit/tree/master/packages/glob) expression to surefire or failsafe report paths. The default is `**/surefire-reports/TEST-*.xml`.

### `create_check`

Optional. Set to `false` to add annotations to the current job where this action is being executed. The default is `true`.

### `check_name`

Optional. Check name to use when creating a check run. The default is `Test Report`.

### `commit`

Optional. The commit sha to update the status. This is useful when you run it with `workflow_run`.

### `fail_on_test_failures`

Optional. Check will fail if there are test failures. The default is `false`.

### `fail_if_no_tests`

Optional. Check will fail if no tests were found. The default is `true`.

### `skip_publishing`

Optional. Skip the test report publishing (check run creation). The default is `false`.

### `github_token`

Optional. Usually in form of `github_token: ${{ secrets.GITHUB_TOKEN }}`. The default is `${{ github.token }}`.

## Example usage

```yml
name: build
on:
  pull_request:

jobs:
  build:
    name: Build and Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v1
      - name: Build and Run Tests
        run: mvn test --batch-mode --fail-at-end
      - name: Publish Test Report
        if: ${{ always() }}
        uses: scacap/action-surefire-report@v1
```

## Tips for Gradle

As Gradle uses a different build directory than Maven by default, you might need to set the `report_paths` variable:

```yaml
    report_paths: '**/build/test-results/test/TEST-*.xml'
```

You also need to enable JUnit XML reports as shown below.

```groovy
test {
  reports {
    junitXml.enabled = true
  }
}
```
