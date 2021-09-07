import { resolve } from "path";
import { shelljs } from "./yshelljs.js";
import { printStd } from "./printStd.js";

const myPath = resolve(__dirname, `..`);
const babelPath = resolve(myPath, `node_modules/.bin/babel`);
const babelConfig: any = { esm: resolve(myPath, "src/config", `babel.esm.config.cjs`), cjs: resolve(myPath, "src/config", `babel.cjs.config.cjs`) };
const extensions = ".ts,.tsx,.js,.jsx";

// console.log(`yyabuilderBabelPath = `, babelPath);

export function babelCmd({ modules, watch }: { modules: string; watch?: boolean }) {
    return `${babelPath} src --config-file ${babelConfig[modules]} --out-dir lib/${modules} --extensions \"${extensions}\" --source-maps${
        watch ? ` -w` : ""
    }`;
}

export function runBabelEsm() {
    const cmd = babelCmd({ modules: "esm" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

export function runBabelCjs() {
    const cmd = babelCmd({ modules: "cjs" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

export function runBabelAll() {
    runBabelEsm();
    runBabelCjs();
}

// && node mjs_import.test.mjs && echo mjs import is ok!
