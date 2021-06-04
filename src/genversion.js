const { resolve } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");
const { writeFileSyncIfChanged } = require("./writeFileSyncIfChanged.js");

const myPath = resolve(__dirname, `..`);

function genversion() {
    const targetFile = resolve(`src/version.ts`);
    try {
        const content = `export const version = '${require("package.json").version}';`;
        writeFileSyncIfChanged(targetFile, content);
        console.log(`${targetFile} = ${content} - created!`);
    } catch (e) {
        console.error(`Failed to create ${targetFile}\n`, e);
    }
}
module.exports = { genversion };
