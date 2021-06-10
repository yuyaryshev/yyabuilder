const { resolve } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");
const { writeFileSyncIfChanged } = require("./writeFileSyncIfChanged.js");

const myPath = resolve(__dirname, `..`);

function cleanCmd({ modules }) {
    //    shelljs.rm(["-rf",""])
    return `rm -rf lib/${modules}/*`;
}

function writePackageJsonToLib({ modules }) {
    const targetFile = resolve(`lib/${modules}/package.json`);
    const content = `{"type":"${modules === "esm" ? "module" : "commonjs"}"}`;
    writeFileSyncIfChanged(targetFile, content);
    console.log(`${targetFile} = ${content} - created!`);
}

function cleanEsm() {
    const cmd = cleanCmd({ modules: "esm" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
    writePackageJsonToLib({ modules: "esm" });
}

function cleanCjs() {
    const cmd = cleanCmd({ modules: "cjs" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
    writePackageJsonToLib({ modules: "cjs" });
}

function cleanTypes() {
    const cmd = cleanCmd({ modules: "types" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function cleanTs() {
    // Used for test compilation with tsc + jest only
    const cmd = cleanCmd({ modules: "ts" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function cleanAll() {
    const cmd = `rm -rf lib/*`;
    console.log(cmd);
    printStd(shelljs.exec(cmd));
    cleanCjs();
    cleanEsm();
    cleanTypes();
    cleanTs();
}

module.exports = { cleanEsm, cleanCjs, cleanTypes, cleanTs, cleanAll };

// && node mjs_import.test.mjs && echo mjs import is ok!
