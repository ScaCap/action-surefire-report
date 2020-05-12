const glob = require('@actions/glob');

const resolveFileAndLine = (output) => {
    const matches = output.match(/\(.*?:\d+\)/g);
    if (!matches) return { file: undefined, line: 1 };

    const [lastItem] = matches.slice(-1);
    const [file, line] = lastItem.slice(1, -1).split(':');
    return { file, line: parseInt(line) };
};

const resolvePath = async (filename) => {
    console.log(__dirname); 
    const globber = await glob.create(`**/${filename}`, {followSymbolicLinks: false});
    const results = await globber.glob();
    return (results.length) ? results[0].slice(__dirname.length + 1) : filename;
}

module.exports = { resolveFileAndLine, resolvePath };
