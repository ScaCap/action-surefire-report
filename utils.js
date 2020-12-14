const glob = require('@actions/glob');
const core = require('@actions/core');
const fs = require('fs');
const parser = require('xml-js');

const resolveFileAndLine = (file, classname, output) => {
    const filename = file ? file : classname.split('.').slice(-1)[0];
    const matches = output.match(new RegExp(`${filename}.*?:\\d+`, 'g'));
    if (!matches) return { filename: filename, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [, line] = lastItem.split(':');
    core.debug(`Resolved file ${filename} and line ${line}`);

    return { filename, line: parseInt(line) };
};

const appendStdOutStdErrAnnotations = async (file, testsuite, pathFailuresSet, annotations) => {
    // gradle saves stdout/stderr directly to the XML file
    const stdOutData = ((testsuite["system-out"] && testsuite["system-out"]._cdata) ||
                       (testsuite["system-out"] && testsuite["system-out"]._text) || '').trim();
    const stdErrData = ((testsuite["system-err"] && testsuite["system-err"]._cdata) ||
                        (testsuite["system-err"] && testsuite["system-err"]._text) || '').trim();
    let raw_details;
    if (!stdErrData && !stdErrData) {
        // maven saves stdout/stderr to an independent file, remove "TEST-" from the file name.
        // http://maven.apache.org/surefire/maven-surefire-plugin/test-mojo.html#redirectTestOutputToFile
        let fileExtIndex = file.lastIndexOf(".");
        if (fileExtIndex < 0) {
            fileExtIndex = file.length;
        }
        // windows path has been canonicalized to '/' path separators by resolvePath. -1 is OK
        // because we add 1 to look for testFilePrefix.
        const lastSeparatorIndex = file.lastIndexOf("/");
        const testFilePrefix = "TEST-";
        let stdOutFile;
        if (file.substr(lastSeparatorIndex + 1, testFilePrefix.length) == testFilePrefix) {
            stdOutFile = file.substr(0, lastSeparatorIndex + 1) +
                file.substring(lastSeparatorIndex + testFilePrefix.length + 1, fileExtIndex);
        } else {
            stdOutFile = file.substring(0, fileExtIndex);
        }
        stdOutFile += "-output.txt";

        let stdOutErrData;
        try {
            stdOutErrData = await fs.promises.readFile(stdOutFile);
            core.debug(`Found stdout/stderr in ${stdOutFile}`);
        } catch (err) {
            stdOutErrData = null;
        }
        raw_details = stdOutErrData ? ("stdout/stderr:\n" + stdOutErrData) : null;
    } else {
        core.debug(`Found stdout/stderr in ${file}`);
        raw_details = ("stdout:\n" + stdOutData + "\n\n\n" + "stderr:\n" + stdErrData);
    }

    if (raw_details) {
        // stdout/stderr is captured at the testsuite or test file level, but the metadata within
        // the xml report may supply a different file path for each failure (as parsed by
        // parseFile). In this case we can't differentiate which stdout/stderr belongs to which
        // failed path, so we use the same stdout/stderr for each.
        for (let pathFailure of pathFailuresSet) {
           annotations.push({
                path: pathFailure,
                start_line: 0,
                end_line: 0,
                start_column: 0,
                end_column: 0,
                annotation_level: 'notice',
                title: "testsuite " + testsuite._attributes.name + " stdout and stderr",
                message: "stdout and stderr are concatenated below...",
                raw_details,
            });
        }
    }
}

const resolvePath = async filename => {
    core.debug(`Resolving path for ${filename}`);
    const globber = await glob.create(`**/${filename}.*`, { followSymbolicLinks: false });
    const results = await globber.glob();
    core.debug(`Matched files: ${results}`);
    const searchPath = globber.getSearchPaths()[0];

    let path = '';
    if (results.length) {
        // skip various temp folders
        const found = results.find(r => !r.includes('__pycache__'));
        if (found) path = found.slice(searchPath.length + 1);
        else path = filename;
    } else {
        path = filename;
    }
    core.debug(`Resolved path: ${path}`);

    // canonicalize to make windows paths use forward slashes
    const canonicalPath = path.replace(/\\/g, '/');
    core.debug(`Canonical path: ${canonicalPath}`);

    return canonicalPath;
};

async function parseFile(file, captureStdOutErr) {
    core.debug(`Parsing file ${file}`);
    let count = 0;
    let skipped = 0;
    let failed = 0;
    let annotations = [];

    const data = await fs.promises.readFile(file);

    const report = JSON.parse(parser.xml2json(data, { compact: true }));
    const testsuites = report.testsuite
        ? [report.testsuite]
        : Array.isArray(report.testsuites.testsuite)
            ? report.testsuites.testsuite
            : [report.testsuites.testsuite];

    for (const testsuite of testsuites) {
        const testcases = Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : testsuite.testcase
                ? [testsuite.testcase]
                : [];
        const pathFailuresSet = new Set()
        for (const testcase of testcases) {
            count++;
            if (testcase.skipped) skipped++;
            if (testcase.failure || testcase.error) {
                failed++;
                const stackTrace = (
                    (testcase.failure && testcase.failure._cdata) ||
                    (testcase.failure && testcase.failure._text) ||
                    (testcase.error && testcase.error._cdata) ||
                    (testcase.error && testcase.error._text) ||
                    ''
                ).trim();

                const message = (
                    (testcase.failure &&
                        testcase.failure._attributes &&
                        testcase.failure._attributes.message) ||
                    (testcase.error &&
                        testcase.error._attributes &&
                        testcase.error._attributes.message) ||
                    stackTrace.split('\n').slice(0, 2).join('\n')
                ).trim();

                const { filename, line } = resolveFileAndLine(
                    testcase._attributes.file,
                    testcase._attributes.classname,
                    stackTrace
                );

                const path = await resolvePath(filename);
                const title = `${filename}.${testcase._attributes.name}`;
                core.info(`${path}:${line} | ${message.replace(/\n/g, ' ')}`);
                pathFailuresSet.add(path);

                annotations.push({
                    path,
                    start_line: line,
                    end_line: line,
                    start_column: 0,
                    end_column: 0,
                    annotation_level: 'failure',
                    title,
                    message,
                    raw_details: stackTrace
                });
            }
        }

        if (captureStdOutErr) {
            await appendStdOutStdErrAnnotations(file, testsuite, pathFailuresSet, annotations);
        }
    }
    return { count, skipped, failed, annotations };
}

const parseTestReports = async (reportPaths, captureStdOutErr) => {
    const globber = await glob.create(reportPaths, { followSymbolicLinks: false });
    let annotations = [];
    let count = 0;
    let skipped = 0;
    let failed = 0;
    for await (const file of globber.globGenerator()) {
        const { count: c, skipped: s, failed: f, annotations: a } =
                        await parseFile(file, captureStdOutErr);
        if (c == 0) continue;
        count += c;
        skipped += s;
        failed += f;
        annotations = annotations.concat(a);
    }
    return { count, skipped, failed, annotations };
};

module.exports = { resolveFileAndLine, resolvePath, parseFile, parseTestReports };
