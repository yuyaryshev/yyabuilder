// TODO Бесконечно заменяет файл снова и снова. При использовании watch соместно с Webstorm теряются данные.

import { join as joinPath, resolve as resolvePath, sep as pathSep } from "path";
import { Dirent, readFileSync, writeFileSync } from "fs";
import { Command } from "commander";
import { IntIdManager } from "./IntIdManager.js";
import { readDirRecursive } from "./readDirRecursive.js";
import { version } from "../projmeta.js";

export const ycplmonDefaultSettings: Settings = {
    srcPath: "src",
    dbPath: `src/cpl.db`,
    rebuildDb: false,
    watch: false,
    interval: 300,
    noDb: true,
    logEachFixedFile: true,
};

export interface Settings {
    srcPath: string;
    logEachFixedFile?: boolean;

    // Not used
    dbPath: string;
    rebuildDb: boolean;
    watch: boolean;
    interval?: number; // seconds before notification
    noDb?: boolean;
}

interface FileCplData {
    cpls: Set<string>;
}

const MAX_CPL_VALUE = 99999999;
const CPL_VALUE_LEN = (MAX_CPL_VALUE + "").length;
const CPL_FULL_LEN = CPL_VALUE_LEN + 4;
const CPL_PADDER = "00000000000000000000000000000000000000000000000000000000000000000000".substr(CPL_VALUE_LEN);
const CPL_NUM_REGEXP = (() => {
    let r = "";
    for (let i = 0; i < CPL_VALUE_LEN; i++) r += "[0-9]";
    return RegExp(r);
})();

const cplStr = (cplValue: number): string => {
    const x = CPL_PADDER + cplValue;
    return "CODE" + x.substr(x.length - CPL_VALUE_LEN);
};

interface CplItem {
    cpl: number;
    filePath: string;
    pos: number;
}

export const fix_cpls = (settings0?: Settings | undefined) => {
    const settings = { ...ycplmonDefaultSettings, ...(settings0 || {}) };
    console.time(`Finished in`);
    const freeCplManager = new IntIdManager({ a: 1, b: 100000000 });
    const cplJsonPath = resolvePath(settings.srcPath, "cpl.json");
    let oldSavedCpls;

    const oldCpl = new Map<number, CplItem>();
    try {
        oldSavedCpls = readFileSync(cplJsonPath, "utf-8");
        const f = JSON.parse(oldSavedCpls);
        for (const cplItem of f) oldCpl.set(cplItem.cpl, cplItem);
        console.log(`Reading cpls from ${cplJsonPath}`);
    } catch (e:any) {
        if (e.code !== "ENOENT") console.error(`Failed to read cpls from ${cplJsonPath}`, e);
        oldCpl.clear();
    }

    const newCpls = new Map<number, CplItem[]>();
    const badCplFiles = new Map<string, Set<number>>();
    const badCpls: Set<CplItem[]> = new Set<CplItem[]>();
    let totalFixes = 0;

    const fileFilter = (filePath: string): boolean => {
        if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) return false;
        const parts = filePath.split(pathSep);
        if (parts.includes("node_modules") || parts.includes(".git")) return false;
        return true;
    };

    const saveToBadCplFiles = (badCplItem: CplItem) => {
        const badCplFileSet = badCplFiles.get(badCplItem.filePath) || new Set();
        if (!badCplFileSet.size) badCplFiles.set(badCplItem.filePath, badCplFileSet);
        badCplFileSet.add(badCplItem.pos);
    };

    const onFile = (filePath: string, readMode: boolean, poses?: Set<number>): void => {
        const startedFileWrite = false;

        if (!readMode) {
            if (!poses) throw new Error(`CODE00000021 'poses' should be set if readMode === false`);
            else totalFixes += poses!.size;
        }

        const oldCode = readFileSync(filePath, "utf-8");
        let code = oldCode;

        //=================== FIX CODExxxxxxxx start =============================
        try {
            const codeParts = code.split("CODE");
            const newCodeParts = [codeParts[0]];
            const codePartsLn = codeParts.length;
            let pos = (codeParts[0] && codeParts[0].length) || 0;

            for (let i = 1; i < codePartsLn; i++) {
                const codePart = codeParts[i];
                pos += codePart.length;
                let cplStrValue = codePart.substr(0, 8);
                const restString = codePart.substr(8);

                if (CPL_NUM_REGEXP.test(cplStrValue)) {
                    const cpl = Number(cplStrValue);
                    const cplItem = { cpl, filePath, pos };

                    const r: CplItem[] = newCpls.get(cpl) || [];

                    if (readMode) {
                        if (r.length || !cpl) {
                            saveToBadCplFiles(cplItem);
                            badCpls.add(r);
                        } else newCpls.set(cpl, r);
                        r.push(cplItem);
                        freeCplManager.removeId(cplItem.cpl);
                    } else {
                        if (poses!.has(pos)) {
                            cplItem.cpl = freeCplManager.newId();
                            cplStrValue = cplStr(cplItem.cpl).substr(4);
                            newCpls.set(cpl, [cplItem]);
                        }
                    }
                }
                if (!readMode) {
                    newCodeParts.push("CODE");
                    newCodeParts.push(cplStrValue);
                    newCodeParts.push(restString);
                }
            }

            if (!readMode) code = newCodeParts.join("");
        } catch (e:any) {
            console.error(filePath, " - error processing file ", e);
        }
        //=================== FIX CODExxxxxxxx end =============================

        if (!readMode) {
            if (code.trim().length !== oldCode.trim().length)
                console.error(
                    `${filePath} - ERROR processing file - generated length (${code.trim().length}) differs from original length (${
                        oldCode.trim().length
                    })`,
                );
            else if (code !== oldCode)
                try {
                    writeFileSync(filePath, code, "utf-8");
                    if (settings.logEachFixedFile) console.log(`${filePath} - fixed ${poses!.size} cpls `);
                } catch (e:any) {
                    console.error(`${filePath} - ERROR FAILED TO WRITE fix for ${poses!.size} cpls `, e);
                    try {
                        writeFileSync(filePath, oldCode, "utf-8");
                    } catch (e2) {
                        console.error("Failed to revert file to original code!");
                    }
                }
        }
    };

    readDirRecursive(settings.srcPath, (dirPath: string, dirent: Dirent): boolean => {
        const filePath = joinPath(dirPath, dirent.name);
        if (dirent.isDirectory()) return true;

        if (!fileFilter(filePath)) return false;
        onFile(filePath, true);
        return false;
    });

    for (const cplItems of badCpls) {
        const cpl = cplItems[0].cpl;
        const oldCplItem = oldCpl.get(cpl) || ({} as any as CplItem);
        let maxScope = 0;
        let maxScoreIndex = 0;
        for (let i = 0; i < cplItems.length; i++) {
            const newCplItem = cplItems[i];
            const score = newCplItem.filePath === oldCplItem.filePath ? 1000000000 - Math.abs(newCplItem.pos - oldCplItem.pos) : 0;
            if (score < maxScope) {
                maxScope = score;
                maxScoreIndex = i;
            }
        }

        newCpls.set(cpl, cplItems.splice(maxScoreIndex, 0));
        for (const badCplItem of cplItems) saveToBadCplFiles(badCplItem);
    }

    for (const [filePath, poses] of badCplFiles) onFile(filePath, false, poses);

    const cplItemsForSaving: CplItem[] = [];
    for (const p of newCpls) cplItemsForSaving.push(p[1][0]);

    const newSavedCpls = JSON.stringify(cplItemsForSaving, undefined, " ");
    if (oldSavedCpls !== newSavedCpls) {
        console.log(`Writing cpls to ${cplJsonPath}`);
        writeFileSync(cplJsonPath, newSavedCpls, "utf-8");
    }

    console.log(`Fixed ${totalFixes} cpls in ${badCplFiles.size} files`);
    console.timeEnd(`Finished in`);
};

/**
 * Starts up console application
 */
export function startupConsole() {
    /**
     * Replaces dublicate CODEnnnnnnnn with unque ones
     */
    function fix(targetPath: string, options: any, command: Command) {
        const { db, rebuild, nowatch, interval, nodb } = program.opts();
        const finalOptions = {
            srcPath: targetPath || ".",
            dbPath: db || joinPath(targetPath, `cpl.db`),
            rebuildDb: rebuild,
            watch: nowatch,
            interval: interval,
            noDb: nodb || true,
            logEachFixedFile: true,
        };
        //console.log(`CODE00000022 fix command started`, finalOptions);
        fix_cpls(finalOptions);
    }

    const program = new Command();
    program
        .version(version)
        // .option("-w, --watch", "NOT USED - Watch for changes. Warning: loses changes if used with WebStorm!")
        // .option("--rebuild", "NOT USED - Rebuild the database")
        // .option("--db <dbpath>", "NOT USED - Custom path for the database")
        // .option("--nodb", `NOT USED - Don't use database`)
        // .option("--interval", "NOT USED - Interval in seconds before watch notification, default 10 seconds")
        .command("* [targetPath]")
        .action(fix)
        .command("fix [targetPath]")
        .description("Replaces dublicate CODEnnnnnnnn with unque ones in all files in targetpath")
        .action(fix);

    program.parse(process.argv);
}
