const core = require('@actions/core');
const action = require('./action');

(async () => {
    try {
        throw new Error("Can't do it")
        await action();
    } catch (error) {
        core.setFailed(error.message);
    }
})();
