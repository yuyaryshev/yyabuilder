const { resolve } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");

const myPath = resolve(__dirname, `..`);
const babelPath = resolve(myPath, `node_modules/.bin/babel`);
const babelConfig = { esm: resolve(myPath, "src/config", `babel.esm.config.cjs`), cjs: resolve(myPath, "src/config", `babel.cjs.config.cjs`) };
const extensions = ".ts,.tsx,.js,.jsx";

// console.log(`ybuilderBabelPath = `, babelPath);

function babelCmd({ modules, watch }) {
    return `${babelPath} src --config-file ${babelConfig[modules]} --out-dir lib/${modules} --extensions \"${extensions}\" --source-maps${
        watch ? ` -w` : ""
    }`;
}

function runBabelEsm() {
    const cmd = babelCmd({ modules: "esm" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function runBabelCjs() {
    const cmd = babelCmd({ modules: "cjs" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

function runBabelAll() {
    runBabelEsm();
    runBabelCjs();
}

module.exports = { runBabelEsm, runBabelCjs, runBabelAll };

// && node mjs_import.test.mjs && echo mjs import is ok!
