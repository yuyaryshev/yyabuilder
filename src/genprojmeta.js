const { resolve } = require("path");
const { shelljs } = require("./yshelljs.js");
const { printStd } = require("./printStd.js");
const { writeFileSyncIfChanged } = require("./writeFileSyncIfChanged.js");
const { readFileSync } = require("fs");

const myPath = resolve(__dirname, `..`);

function genprojmeta(mode) { // :"src" | "esm" | "cjs"
    const packageJson = JSON.parse(readFileSync("./package.json","utf-8"));
    const {version, name} = packageJson;
    const targetVariants = {
        src:`src/projmeta.ts`,
        esm:`lib/esm/projmeta.js`,
        cjs:`lib/cjs/projmeta.js`,
    }

    const targetFile = resolve(targetVariants[mode]);
    try {
        const content = (mode === "cjs"? `"use strict";\n\nmodule.exports = {version: '${version}', packageName: '${name}'};\nObject.defineProperty(exports, "__esModule", {value: true});\n`: `export const version = '${version}';\nexport const packageName = '${name}';\n`);
        writeFileSyncIfChanged(targetFile, content);
        console.log(`${targetFile} = ${content.split("\n").join(" ").trim()} - created!`);
    } catch (e) {
        console.error(`Failed to create ${targetFile}\n`, e);
    }
}
module.exports = { genprojmeta };