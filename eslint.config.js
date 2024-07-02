const globals = require('globals');
const js = require('@eslint/js');
const {FlatCompat} = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [{
    ignores: ['dist/*'],
}, ...compat.extends('eslint:recommended'), {
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.node,
            ...globals.jest,
            Atomics: 'readonly',
            SharedArrayBuffer: 'readonly',
        },

        ecmaVersion: 2018,
        sourceType: 'commonjs',
    },

    rules: {
        indent: 2,
    },
}];
