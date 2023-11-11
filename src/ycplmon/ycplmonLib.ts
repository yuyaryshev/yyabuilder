// TODO Бесконечно заменяет файл снова и снова. При использовании watch соместно с Webstorm теряются данные.

import { join as joinPath, resolve as resolvePath, sep as pathSep } from "path";
import { Dirent, readFileSync, writeFileSync } from "fs";
import { Command } from "commander";
import { IntIdManager } from "./IntIdManager.js";
import { readDirRecursive } from "./readDirRecursive.js";
import { version } from "../projmeta.js";
import { strPosConverter } from "./strPosToRC.js";
import { createHash } from "node:crypto";
import { StrRef } from "./strRef.js";

export const ycplmonDefaultSettings: YcplmonSettings = {
    srcPath: "src",
    dbPath: `src/cpl.db`,
    rebuildDb: false,
    watch: false,
    interval: 300,
    noDb: true,
    logEachFixedFile: true,
};

export interface YcplmonSettings {
    srcPath: string;
    logEachFixedFile?: boolean;

    // Not used
    dbPath: string;
    rebuildDb: boolean;
    watch: boolean;
    interval?: number; // seconds before notification
    noDb?: boolean;
    workspaces?: boolean;
}

interface FileCplData {
    cpls: Set<string>;
}

const tailMinLength = 100;

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
    fileLine: number;
    linePos: number;
    pos: number;
    prefix: StrRef;
    tail: StrRef;
    cplPosKey: string;
    anchorKey?: string;
}

export function cplItemsFromStr(s: string): CplItem[] {
    try {
        const lines = s.split("\n");
        const r: CplItem[] = [];
        let lineIndex = 0;
        for (let line of lines) {
            if (!line.trim().length) {
                continue;
            }
            try {
                lineIndex++;
                const [filePath, fileLine, linePos, pos0, cplStr, anchorKey] = line.split(":");
                const pos = +pos0;
                const cplItem: CplItem = {
                    filePath,
                    fileLine: +fileLine,
                    linePos: +linePos,
                    pos,
                    cpl: +cplStr.substr(4, 8),
                    prefix: {s:""},
                    tail: {s:""},
                    cplPosKey: makeCplPosKey(filePath, pos),
                    anchorKey,
                };
                r.push(cplItem);
            } catch (e: any) {
                console.warn(`CODE00000009 Broken line ${lineIndex} in cpl.clsv`);
            }
        }
        return r;
    } catch (e: any) {
        return [];
    }
}

export function cplItemsToStr(cplItems: CplItem[]): string {
    const lines = cplItems.map(
        (cplItem) => `${cplItem.filePath}:${cplItem.fileLine}:${cplItem.linePos}:${cplItem.pos}:${cplStr(cplItem.cpl)}:${cplItem.anchorKey}\n`,
    );
    return lines.sort().join("");
}

export const fix_cpls = (settings0?: YcplmonSettings | undefined) => {
    const settings = { ...ycplmonDefaultSettings, ...(settings0 || {}) };
    console.time(`Finished in`);
    const freeCplManager = new IntIdManager({ a: 1, b: 100000000 });
    const cplJsonPath = resolvePath(settings.srcPath, "cpl.clsv");
    let oldSavedCpls;

    const cplMap: CplMap = new Map();

    const upsertCplMap = (cpl: number): CplMapItem => {
        const r = cplMap.get(cpl);
        if (r) return r;
        const r2 = { items: [] };
        cplMap.set(cpl, r2);
        freeCplManager.removeId(cpl);
        return r2;
    };

    try {
        oldSavedCpls = readFileSync(cplJsonPath, "utf-8");
        const f = cplItemsFromStr(oldSavedCpls);
        for (const dbItem of f) {
            cplMap.set(dbItem.cpl, { dbItem, items: [] });
        }
        console.log(`Reading cpls from ${cplJsonPath}`);
    } catch (e: any) {
        if (e.code !== "ENOENT") console.error(`Failed to read cpls from ${cplJsonPath}`, e);
        cplMap.clear();
    }

    const cplMapZeroItem: CplMapItem = { items: [] };
    cplMap.set(0, cplMapZeroItem);

    const badCpls: Set<CplItem> = new Set();

    let totalFixes = 0;

    const fileFilter = (filePath: string): boolean => {
        if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) return false;
        const posixPath = filePath.split("\\").join("/");
        const parts = filePath.split(pathSep);
        if (parts.includes("node_modules") || parts.includes(".git")) return false;
        const libIndex = parts.indexOf("lib");
        if (
            posixPath.includes("/lib/cjs/") ||
            posixPath.includes("/lib/ts/") ||
            posixPath.includes("/lib/esm/") ||
            posixPath.includes("/lib/types/")
        ) {
            return false;
        }
        return true;
    };

    const onFile = (filePath: string, readMode: boolean, itemPosKeys?: Set<string>): void => {
        const startedFileWrite = false;

        if (!readMode) {
            if (!itemPosKeys) throw new Error(`CODE00000021 'poses' should be set if readMode === false`);
            else totalFixes += itemPosKeys!.size;
        }

        const oldCode = readFileSync(filePath, "utf-8");
        let code = oldCode;

        //=================== FIX CODExxxxxxxx start =============================
        try {
            const splitted = splitCplFile(filePath, code);

            if (readMode) {
                for (let cplItem of splitted.parts) {
                    const mapItem = upsertCplMap(cplItem.cpl);
                    mapItem.items.push(cplItem);
                    if (!cplItem.cpl || mapItem.items.length > 1) {
                        if (mapItem.items.length == 2) {
                            badCpls.add(mapItem.items[0]);
                        }
                        badCpls.add(cplItem);
                    }
                }
            } else {
                for (let cplItem of splitted.parts) {
                    if (itemPosKeys!.has(cplItem.cplPosKey)) {
                        cplItem.cpl = freeCplManager.newId();
                        const mapItem = upsertCplMap(cplItem.cpl);
                        mapItem.items.push(cplItem);
                    }
                }
                code = joinCplFile(splitted);
            }
        } catch (e: any) {
            console.error(filePath, " - error processing file ", e);
        }
        //=================== FIX CODExxxxxxxx end =============================

        if (!readMode && code !== oldCode) {
            if (code.trim().length !== oldCode.trim().length)
                console.error(
                    `${filePath} - ERROR processing file - generated length (${code.trim().length}) differs from original length (${
                        oldCode.trim().length
                    })`,
                );
            else
                try {
                    writeFileSync(filePath, code, "utf-8");
                    if (settings.logEachFixedFile) console.log(`${filePath} - fixed ${itemPosKeys!.size} cpls `);
                } catch (e: any) {
                    console.error(`${filePath} - ERROR FAILED TO WRITE fix for ${itemPosKeys!.size} cpls `, e);
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
        if (dirent.name === "node_modules" || dirent.name === "lib") {
            return false;
        }

        if (dirent.isDirectory()) {
            return true;
        }

        if (settings.workspaces && !filePath.includes("packages")) {
            return false;
        }

        if (!fileFilter(filePath)) return false;
        onFile(filePath, true);
        return false;
    });

    const posKeysToBeAutofixed = new Map<string, Set<string>>();
    const addToBeAutofixed = (cplItem: CplItem) => {
        const badCplFileSet = posKeysToBeAutofixed.get(cplItem.filePath) || new Set();
        if (!badCplFileSet.size) posKeysToBeAutofixed.set(cplItem.filePath, badCplFileSet);
        badCplFileSet.add(cplItem.cplPosKey);
    };

    // Remove known correct cpls from badCpls
    for (const cplItem of badCpls) {
        if (cplItem.cpl) {
            const mapItem = cplMap.get(cplItem.cpl);
            const dbItem = mapItem?.dbItem;
            if (dbItem) {
                const incorrectItems: CplItem[] = [];
                const correctItems: CplItem[] = [];
                for (const item of mapItem.items) {
                    if (item.cplPosKey === dbItem.cplPosKey || item.anchorKey === dbItem.anchorKey) {
                        correctItems.push(item);
                    } else {
                        incorrectItems.push(item);
                    }
                }

                if (correctItems.length === 1) {
                    mapItem.items = correctItems;
                    badCpls.delete(correctItems[0]);
                    for (const item of incorrectItems) {
                        item.cpl = 0;
                        cplMapZeroItem.items.push(item);
                    }
                }
            }
        }
    }

    const unfixedCpls: Set<number> = new Set();

    // Replace zero cpls with new values
    for (const cplItem of badCpls) {
        if (!cplItem.cpl) {
            addToBeAutofixed(cplItem);
        } else {
            unfixedCpls.add(cplItem.cpl);
        }
    }

    for (const [filePath, cplItems] of posKeysToBeAutofixed) onFile(filePath, false, cplItems);

    let logicViolation: string | undefined;
    const cplItemsForSaving: CplItem[] = [];
    for (const [cplNum, cplMapItem] of cplMap) {
        if (!cplNum) {
            continue;
        }
        if (cplMapItem.items.length > 1) {
            logicViolation = fromNumCpl(cplNum);
        } else if (cplMapItem.items.length === 1) {
            cplItemsForSaving.push(cplMapItem.items[0]);
        }
    }

    if (logicViolation) {
        console.warn(`CODE00654011 Internal error. Many records on one cpl. Shouldn't be here! Cpl= ${logicViolation}`);
    } else {
        const newSavedCpls = cplItemsToStr(cplItemsForSaving);
        if (oldSavedCpls !== newSavedCpls) {
            console.log(`Writing cpls to ${cplJsonPath}`);
            writeFileSync(cplJsonPath, newSavedCpls, "utf-8");
        }
    }

    console.log(`Fixed ${totalFixes} cpls in ${posKeysToBeAutofixed.size} files`);
    if (unfixedCpls.size) {
        console.error(`Found invalid cpls, cant fix them:\n${[...unfixedCpls].map((cpl) => fromNumCpl(cpl)).join("\n")}\n\n`);
    }
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

/// VERSION2
export interface CplMapItem {
    dbItem?: CplItem;
    items: CplItem[];
}
export type CplMap = Map<number, CplMapItem>;

export interface SplittedCplFile {
    fileContents: string;
    parts: CplItem[];
}

const splitByCplRegexNoCapture = /CODE\d{8}/g;
const whitespaceRegex = /[ ][\t][\n][\r]/g;
const splitByCplRegex = /(CODE\d{8})/g;

export function makeAnchorKey(fileContents: string, cplItem: CplItem) {
    const { filePath, pos } = cplItem;
    const anchorSize = 200;
    let start = pos - anchorSize;
    if (start < 0) {
        start = 0;
    }
    const anchor = fileContents
        .slice(start, pos + anchorSize)
        .split(splitByCplRegexNoCapture)
        .join()
        .split(whitespaceRegex)
        .join("");

    const anchorKey = createHash("sha256").update(anchor).digest("hex");
    return anchorKey;
}

export function splitCplFile(filePath: string, fileContents: string): SplittedCplFile {
    const parts: CplItem[] = [];
    let match;

    const r0: StrRef[] = fileContents.split(splitByCplRegex).map((s) => {
        return { s };
    });

    const result: SplittedCplFile = {
        fileContents,
        parts: [],
    };
    if (r0.length <= 1) {
        return result;
    }

    let pos = r0[0].s.length;
    const posConv = strPosConverter(fileContents);
    let nextPrefix = r0[0];
    for (let i = 1; i < r0.length; i += 2) {
        const { r, c } = posConv.fromPos(pos);

        const prefix = nextPrefix;

        const p: CplItem = {
            cpl: toNumCpl(r0[i].s),
            prefix: r0[i - 1],
            tail: r0[i + 1],
            fileLine: r,
            linePos: c,
            pos,
            filePath,
            cplPosKey: makeCplPosKey(filePath, pos),
        };

        // const strBefore = fileContents.slice(pos - 200, pos);
        // const strAfter = fileContents.slice(pos, pos + CPL_FULL_LEN + 200);
        p.anchorKey = makeAnchorKey(fileContents, p);

        pos += r0[i].s.length;
        pos += r0[i + 1].s.length;
        result.parts.push(p);
    }

    return result;
}

export function joinCplFile(splittedCplFile: SplittedCplFile): string {
    if (!splittedCplFile.parts.length) {
        return splittedCplFile.fileContents;
    }
    const r0 = [];
    let i = 0;
    for (let part of splittedCplFile.parts) {
        if (i++ === 0) {
            r0.push(part.prefix);
        }
        r0.push(fromNumCpl(part.cpl), part.tail.s);
    }
    return r0.join("");
}

export function toNumCpl(cpl: string): number {
    return +cpl.slice(4);
}

export function fromNumCpl(numCpl: number): string {
    return "CODE" + ("" + (numCpl + 100000000)).slice(1);
}

export function makeCplPosKey(filePath: string, pos: number): string {
    return `${filePath}:${pos}`;
}
