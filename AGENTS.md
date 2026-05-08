## Repository Map
- `.`: main action implementation and Jest coverage live at the repo root in `index.js`, `action.js`, `utils.js`, `action.test.js`, and `utils.test.js`.
- `dist/`: checked-in bundle executed by GitHub Actions via `action.yml`; regenerate it with `npm run package` instead of editing it by hand.
- `integration-tests/maven`: Maven fixture project that generates Surefire and Failsafe XML consumed by the parser tests.
- `integration-tests/python`: pytest fixture project that generates `integration-tests/python/report.xml`.
- `integration-tests/go`: Go fixture project that generates `integration-tests/go/report.xml`.
- `integration-tests/custom_reports`: checked-in XML edge cases used directly by the parser tests.

## Build, Test, and Development Commands
- Run commands from the repo root unless a command explicitly `cd`s into a fixture subdirectory.
- Use `npm` as the package manager. The repo tracks `package-lock.json`, and `package.json` requires Node `>=24.0.0`.
- `npm install`: install dependencies before linting, packaging, or running Jest.
- `npm run eslint`: run after editing the root JavaScript action code or Jest tests.
- `npm run package`: rebuild `dist/index.js` after source changes that affect runtime behavior.
- `cd integration-tests/maven && mvn clean verify --batch-mode -Dmaven.test.failure.ignore=true`: regenerate Maven Surefire and Failsafe fixtures.
- `pytest integration-tests/python/ --junit-xml=integration-tests/python/report.xml || exit 0`: regenerate the Python JUnit fixture. The `|| exit 0` is intentional so failing fixture tests still produce XML.
- `cd integration-tests/go && go install github.com/jstemmer/go-junit-report/v2@latest && go test -v 2>&1 ./... | go-junit-report -out report.xml`: regenerate the Go JUnit fixture.
- `npm run test`: run the Jest suite after the required fixture-generation steps have produced the XML files under `integration-tests/`.
- Smallest useful validation for code changes: run `npm run eslint`, refresh any affected fixtures, run `npm run test`, and run `npm run package` if the runtime bundle should change.

## PR and Commit Conventions
- Use the checked-in PR template at `.github/PULL_REQUEST_TEMPLATE.md` and fill in both sections: `What` and `How`.
- No stronger repository-specific commit message format is evidenced here; keep commit messages descriptive and scoped to the change.

## Constraints and Non-Negotiables
- This repository is the legacy `ScaCap/action-surefire-report@v1` line. `README.md`, `action.yml`, and runtime messaging point new adoption and ongoing development to `ScalableCapital/action-surefire-report@v2`, with support for this line ending after `2026-08-01`.
- GitHub Actions runs `dist/index.js`, not the source entrypoint. If behavior changes in `index.js`, `action.js`, or `utils.js`, rebuild the bundle with `npm run package`.
- Treat `dist/` as generated output. Do not hand-edit bundled files.
- Do not treat `npm run test` as a clean-checkout standalone command. The Jest suite expects generated Maven `target/...` reports plus `integration-tests/python/report.xml` and `integration-tests/go/report.xml` to already exist.
- Treat `integration-tests/` as fixture territory for parser coverage. Routine feature work should usually stay in the root JavaScript action code unless you are intentionally changing fixture coverage.
- Keep npm dependency updates pinned to exact versions. `.npmrc` sets `save-exact = true`.
