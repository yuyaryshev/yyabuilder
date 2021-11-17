import { dirname, resolve } from "path";
import { shelljs } from "./yshelljs.js";
import { printStd } from "./printStd.js";
import { lstatSync, readFileSync } from "fs";
import { writeFileSyncIfChanged } from "./writeFileSyncIfChanged.js";
import { sync as execaSync } from "execa";

import { EslintResult, parseEslintOutput, YEslintFileRecord, YEslintMessage } from "./parseEslintOutput.js";

const myPath = resolve(__dirname, `..`);

// eslint src --config .eslintrc_js_extensions.cjs -f ./src/add_js_formatter_for_eslint.cjs
// D:\b\Mine\GIT_Work\yyabuilder\.eslintrc_js_extensions.cjs

const allJsExtensions = "ts,tsx,js,jsx,cjs,mjs";
export function eslintBlobForAllJsExtensions(basePath: string) {
    const r = `{${allJsExtensions
        .split(",")
        .map((e) => `${basePath}/**/*.${e}`)
        .join(",")}}`;
    // const r = `${basePath}/**/*.{${allJsExtensions}`;
    //console.log(`CODE00000025 eslintBlobForAllJsExtensions = ${r}`)
    return r;
}

export function add_js_to_imports() {
    const formatterAbsPath = resolve(__dirname, "./add_js_formatter_for_eslint.cjs");
    const configAbsPath = resolve(__dirname, "../../src/eslintrc_js_extensions.cjs");
    const args = [eslintBlobForAllJsExtensions("src"), "--config", configAbsPath];
    //console.log(`CODE00000155 add_js_to_imports args:\neslint`, args.join(" "));
    let eslintOut;
    try {
        //console.log("add_js_to_imports v3 started:", {"process.cwd()":process.cwd()});
        const { stdout, stderr } = execaSync("eslint", args);
        eslintOut = stdout;
    } catch (e: any) {
        if (e?.exitCode !== 1) console.error(e);
        eslintOut = e.stdout;
    }

    try {
        //const eslintResult:EslintResult = JSON.parse(eslintOut);
        const eslintResult: EslintResult = parseEslintOutput(eslintOut);

        for (const fileRecord0 of eslintResult) {
            const fileRecord: YEslintFileRecord = fileRecord0 as YEslintFileRecord;
            const messages = fileRecord.messages.filter((m: YEslintMessage) => m.ruleId === "import/extensions");
            if (!messages.length) continue;
            const linesIndexesToFix = messages.map((m: YEslintMessage) => m.line);

            const fileContents = readFileSync(fileRecord.filePath, "utf-8");
            const fileLines = fileContents.split("\n");
            for (const lineIndex of linesIndexesToFix) {
                const fileLine = fileLines[lineIndex - 1];
                try {
                    let newFileLine = fileLine;
                    const sep = fileLine.includes('"') ? '"' : fileLine.includes("'") ? "'" : fileLine.includes("`") ? "`" : "FAILED";
                    const splittedLine = fileLine.split("'").join('"').split('"');
                    const importPath = splittedLine[splittedLine.length - 2];

                    const includer = dirname(fileRecord.filePath);
                    //console.log({cpl:"CODE00555000",includer, importPath})
                    const importFullPath = resolve(includer, importPath);
                    // importPath
                    // existsSync

                    if (!splittedLine[splittedLine.length - 2].endsWith(".js")) {
                        let doneFixing = false;
                        try {
                            if (lstatSync(importFullPath).isDirectory()) {
                                splittedLine[splittedLine.length - 2] = splittedLine[splittedLine.length - 2] + "/index.js";
                                doneFixing = true;
                            }
                        } catch (e: any) {
                            doneFixing = false;
                        }
                        if (!doneFixing) {
                            splittedLine[splittedLine.length - 2] = splittedLine[splittedLine.length - 2] + ".js";
                        }
                    }

                    newFileLine = splittedLine.join('"');
                    fileLines[lineIndex - 1] = newFileLine;
                } catch (e: any) {
                    console.warn(
                        `CODE00000016 Failed to add js extension to import:\n    ${fileLine}\n    at ${fileRecord.filePath}:${
                            lineIndex + 1
                        }\nBecause of exception:\n    ${e.stack}`,
                    );
                }
            }
            const newFileContents = fileLines.join("\n");
            writeFileSyncIfChanged(fileRecord.filePath, newFileContents);
            //        console.log(`CODE00000017`, { fileRecord, message, linesToFix: linesIndexesToFix, fileLine, importPath, includer, importFullPath });
            //        for (const message of messages) console.log(`CODE00000018`, { fileRecord, message, linesToFix: linesIndexesToFix });
        }
        //console.log(`CODE00990000 add_js_to_imports stdout`, eslintResult);
    } catch (e: any) {
        console.error("CODE00993330", e);
    }
}
