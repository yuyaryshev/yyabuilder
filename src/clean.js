const { resolve, join } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");
const { writeFileSyncIfChanged } = require("./writeFileSyncIfChanged.js");
const { genprojmeta } = require("./genprojmeta.js");

const myPath = resolve(__dirname, `..`);

function cleanCmd(...pathParts) {
    const fullPath = join(...pathParts);
    console.log(`rm -rf ${fullPath}/*`);
    const r = shelljs.rm("-rf", `${fullPath}/*`);
    printStd(r);
}

function writePackageJsonToLib({ modules, type }) {
    const targetFile = resolve(`lib/${modules}/package.json`);
    const content = `{"type":"${type || (modules === "esm" ? "module" : "commonjs")}"}`;
    writeFileSyncIfChanged(targetFile, content);
    console.log(`${targetFile} = ${content} - created!`);
}

function cleanEsm() {
    cleanCmd("lib", "esm");
    genprojmeta("esm");
    writePackageJsonToLib({ modules: "esm" });
}

function cleanCjs() {
    cleanCmd("lib", "cjs");
    genprojmeta("cjs");
    writePackageJsonToLib({ modules: "cjs" });
}

function cleanTypes() {
    cleanCmd("lib", "types");
}

function cleanTs() {
    // Used for test compilation with tsc + jest only
    cleanCmd("lib", "ts");
}

function cleanFrontend() {
    cleanCmd("lib", "frontend");
    writePackageJsonToLib({ modules: "cjs", type: "commonjs" });
}

function cleanDocs() {
    cleanCmd("docs");
}

function cleanAll() {
    cleanCmd("lib");
    cleanCjs();
    cleanEsm();
    cleanTypes();
    cleanTs();
    cleanFrontend();
    cleanDocs();
}

module.exports = { cleanEsm, cleanCjs, cleanTypes, cleanTs, cleanDocs, cleanAll };

// && node mjs_import.test.mjs && echo mjs import is ok!
