const { resolve } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");
const {writeFileSyncIfChanged} = require("./writeFileSyncIfChanged.js");

const myPath = resolve(__dirname, `..`);
const typescriptPath = resolve(myPath, `node_modules/.bin/tsc`);
const typescriptConfig = { esm: resolve(myPath, "src/config", `tsconfig-esm.json`), cjs: resolve(myPath, "src/config", `tsconfig-cjs.json`) };
const extensions = ".ts,.tsx,.js,.jsx";

// console.log(`typescriptPath = `, typescriptPath);

function typescriptCmd({ modules, watch }) {
    return `${typescriptPath} -p ${typescriptConfig[modules]}`;
}

function runTypescriptEsm() {
    writeFileSyncIfChanged()
    const cmd = typescriptCmd({ modules: "esm" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function runTypescriptCjs() {
    const cmd = typescriptCmd({ modules: "cjs" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function runTypescriptAll() {
    runTypescriptEsm();
    runTypescriptCjs();
}

module.exports = { runTypescriptEsm, runTypescriptCjs, runTypescriptAll };

// && node mjs_import.test.mjs && echo mjs import is ok!
