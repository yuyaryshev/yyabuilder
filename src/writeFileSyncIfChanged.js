const { readFileSync, outputFileSync } = require("fs-extra");
const writeFileSyncIfChanged = (fileName, content) => {
    let current;
    try {
        current = readFileSync(fileName, "utf-8");
    } catch (e) {}
    if (current !== content) {
        outputFileSync(fileName, content, "utf-8");
        return true;
    }
    return false;
};

module.exports = { writeFileSyncIfChanged };
