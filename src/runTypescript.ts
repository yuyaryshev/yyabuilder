import { resolve } from "path";
import { shelljs } from "./yshelljs.js";
import { printStd } from "./printStd.js";
import { writeFileSyncIfChanged } from "./writeFileSyncIfChanged.js";

const myPath = resolve(__dirname, `..`);
const typescriptPath = resolve(myPath, `node_modules/.bin/tsc`);
const typescriptConfig: any = { esm: resolve(myPath, "src/config", `tsconfig-esm.json`), cjs: resolve(myPath, "src/config", `tsconfig-cjs.json`) };
const extensions = ".ts,.tsx,.js,.jsx";

// console.log(`typescriptPath = `, typescriptPath);

export function typescriptCmd({ modules, watch }: { modules: string; watch?: boolean }) {
    return `${typescriptPath} -p ${typescriptConfig[modules]}`;
}

export function runTypescriptEsm() {
    // writeFileSyncIfChanged();
    const cmd = typescriptCmd({ modules: "esm" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

export function runTypescriptCjs() {
    const cmd = typescriptCmd({ modules: "cjs" });
    console.log(cmd);
    printStd(shelljs.exec(cmd));
}

export function runTypescriptAll() {
    runTypescriptEsm();
    runTypescriptCjs();
}

// && node mjs_import.test.mjs && echo mjs import is ok!
