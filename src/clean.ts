import { resolve, join } from "path";
import { shelljs } from "./yshelljs.js";
import { printStd } from "./printStd.js";
import { writeFileSyncIfChanged } from "./writeFileSyncIfChanged.js";
import { genprojmeta } from "./genprojmeta.js";

const myPath = resolve(__dirname, `..`);

function cleanCmd(...pathParts: string[]) {
    const fullPath = join(...pathParts);
    console.log(`rm -rf ${fullPath}/*`);
    const r = shelljs.rm("-rf", `${fullPath}/*`);
    printStd(r);
}

function writePackageJsonToLib({ modules, type }: { modules: string; type?: string }) {
    const targetFile = resolve(`lib/${modules}/package.json`);
    const content = `{"type":"${type || (modules === "esm" ? "module" : "commonjs")}"}`;
    writeFileSyncIfChanged(targetFile, content);
    console.log(`${targetFile} = ${content} - created!`);
}

export function cleanEsm() {
    cleanCmd("lib", "esm");
    genprojmeta("esm");
    writePackageJsonToLib({ modules: "esm" });
}

export function cleanCjs() {
    cleanCmd("lib", "cjs");
    genprojmeta("cjs");
    writePackageJsonToLib({ modules: "cjs" });
}

export function cleanTypes() {
    cleanCmd("lib", "types");
}

export function cleanTs() {
    // Used for test compilation with tsc + jest only
    cleanCmd("lib", "ts");
}

export function cleanFrontend() {
    cleanCmd("lib", "frontend");
    writePackageJsonToLib({ modules: "cjs", type: "commonjs" });
}

export function cleanDocs() {
    cleanCmd("docs");
}

export function cleanAll() {
    cleanCmd("lib");
    cleanCjs();
    cleanEsm();
    cleanTypes();
    cleanTs();
    cleanFrontend();
    cleanDocs();
}

// && node mjs_import.test.mjs && echo mjs import is ok!
