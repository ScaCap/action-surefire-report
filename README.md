# GitHub Action: Process maven surefire reports

![](https://github.com/scacap/action-surefire-report/workflows/build/badge.svg)


This action processes maven surefire or failsafe XML reports on pull requests and shows the result as a PR check with summary and annotations.

![Screenshot](./screenshot.png)

## Inputs

### `github_token`

**Required**. Usually in form of `github_token: ${{ secrets.GITHUB_TOKEN }}`.

### `report_paths`

Optional. [Glob](https://github.com/actions/toolkit/tree/master/packages/glob) expression to surefire or failsafe report paths. The default is `**/surefire-reports/TEST-*.xml`.

### `check_name`

Optional. Check name to use when creating a check run. The default is `Test Report`.

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
        run: mvn test --batch-mode -Dmaven.test.failure.ignore=true
      - name: Publish Test Report
        uses: scacap/action-surefire-report@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```