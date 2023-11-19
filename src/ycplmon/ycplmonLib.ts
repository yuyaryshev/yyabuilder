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
import { GenericTextTransformer } from "./GenericTextTransformer.js";
import { CplItem, CplRefItem, cplRefPrefix, makeCplPosKey, newYbTextTransformer, YbTextTransformer } from "./yb_types.js";
import { writeFileIfChangedSync } from "./writeFileIfChanged.js";

export const cplTableFileName = "cpl.clsv";
export const cplDbFileName = "cpl.json";
export const missingScenariosFileName = "missing_scenarios.txt";
const ycplmonGeneratedFiles = [cplTableFileName, cplDbFileName, missingScenariosFileName];

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
    addTxtExtension?: boolean;

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
export const CPL_FULL_LEN = CPL_VALUE_LEN + 4;
export const CPL_REF_FULL_LEN = CPL_FULL_LEN;
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

const cplStrWoCode = (cplValue: number): string => {
    const x = CPL_PADDER + cplValue;
    return x.substr(x.length - CPL_VALUE_LEN);
};

interface CplDbItem {
    cpl: number;
    filePath: string;
    fileLine: number;
    linePos: number;
    pos: number;
    cplPosKey: string;
    anchorKey: string;
}

export function makeRefStr(cplRefItem: CplRefItem, state?: string) {
    const cplItem = cplRefItem.cplItem!;
    const s = `${cplRefPrefix}${cplStrWoCode(cplItem.cpl)} ${state !== undefined ? state : ""} ${cplItem.expectation || "1"} ${cplItem.severity} ${
        cplItem.message
    }`;
    return s;
}

export function cplItemsFromStr(s: string): CplDbItem[] {
    try {
        const lines = s.split("\n");
        const r: CplDbItem[] = [];
        let lineIndex = 0;
        for (let line of lines) {
            if (!line.trim().length) {
                continue;
            }
            try {
                lineIndex++;
                const [filePath, fileLine, linePos, pos0, cplStrWoCode, anchorKey] = line.split(":");
                const pos = +pos0;
                const cplItem: CplDbItem = {
                    filePath,
                    fileLine: +fileLine,
                    linePos: +linePos,
                    pos,
                    cpl: +cplStrWoCode,
                    cplPosKey: makeCplPosKey(filePath, pos),
                    anchorKey,
                };
                r.push(cplItem);
            } catch (e: any) {
                console.warn(`CODE00000009 Broken line ${lineIndex} in ${cplTableFileName}`);
            }
        }
        return r;
    } catch (e: any) {
        return [];
    }
}

export function cplItemsToStr(cplItems: CplItem[]): string {
    const lines = cplItems.map((cplItem) => `${cplItem.cplPart.getSourcePosAddrStr()}:${cplStrWoCode(cplItem.cpl)}:${cplItem.anchorKey}\n`);
    return lines.sort().join("");
}

export function makeCplDbContent(cplItems: CplItem[]): any {
    const r: any = {};
    for (const cplItem of cplItems) {
        const rr: any = (r[cplStrWoCode(cplItem.cpl)] = {
            posAddr: cplItem.cplPart.getSourcePosAddrStr(),
            message: cplItem.message,
            severity: cplItem.severity,
            expectation: cplItem.expectation,
            ylog_name: cplItem.ylog_name,
            cpl_comment: cplItem.cpl_comment,
            hasYlogOn: cplItem.ylog_on_part ? 1 : undefined,
            refs: cplItem.refs.map((ref) => ref.refPart.getSourcePosAddrStr()),
        });
        for (let k in rr) {
            if (rr[k] === undefined) {
                delete rr[k];
            }
        }
    }
    return r;
}

export function makeMissingScenarios(cplItems: CplItem[], refItems: Set<CplRefItem>): string {
    const groppedByFiles: { [key: string]: { lines: string[] } } = {};
    const upsertReportFile = (fileName: string) => {
        return groppedByFiles[fileName] || (groppedByFiles[fileName] = { lines: [] });
    };

    for (const cplItem of cplItems) {
        if (!cplItem.ylog_name) {
            continue;
        }

        if (!cplItem.refs.filter((ref) => ref.refPart.parent.getFilePath().includes("scenario")).length) {
            const reportLine0 = `${cplRefPrefix}${cplStrWoCode(cplItem.cpl)}    ${cplItem.expectation || "1"} ${cplItem.severity || "D"} ${
                cplItem.message || "?"
            }`;
            const reportLine = `${JSON.stringify(reportLine0)}, // ${cplItem.ylog_name}\n`;
            upsertReportFile(cplItem.cplPart.parent.getFilePath()).lines.push(reportLine);
        }
    }

    const reportParts: string[] = [];

    for (let fileKey in groppedByFiles) {
        const groppedByFile = groppedByFiles[fileKey];
        const reportPart = `${fileKey}\n` + groppedByFile.lines.map((s) => "    " + s).join("");
        reportParts.push(reportPart);
    }

    return reportParts.join("");
}

export function toLinuxPath(s: string): string {
    return s.split("\\").join("/");
}

export function fix_ylog_on(cplItem: CplItem) {
    if (cplItem.ylog_on_part) {
        const [prefix, numStr, suffix] = cplItem.ylog_on_part.captures;
        const newNum = 100000000 + cplItem.cpl;
        if (+numStr !== newNum) {
            cplItem.ylog_on_part.replaceWith(`${prefix}${newNum}${suffix}`);
        }
    }
}

export const fix_cpls = (settings0?: YcplmonSettings | undefined) => {
    const logicViolations: string[] = [];
    const settings = { ...ycplmonDefaultSettings, ...(settings0 || {}) };
    console.time(`Finished in`);
    const freeCplManager = new IntIdManager({ a: 1, b: 100000000 });
    let folderPath = toLinuxPath(resolvePath(settings.srcPath));
    if (folderPath[folderPath.length - 1] !== "/") {
        folderPath += "/";
    }

    const cplTablePath = resolvePath(settings.srcPath, cplTableFileName);
    const cplDbPath = resolvePath(settings.srcPath, cplDbFileName);
    const missingScenariosPath = resolvePath(settings.srcPath, missingScenariosFileName);
    function toRelPath(s: string) {
        s = toLinuxPath(s);
        if (s.startsWith(folderPath)) {
            return s.slice(folderPath.length);
        }
        return s;
    }

    function toAbsPath(s: string) {
        s = toLinuxPath(s);
        return !s.startsWith(folderPath) ? folderPath + s : s;
    }

    let oldSavedCpls;

    const cplMap: CplMap = new Map();
    const dbByAnchorKey: Map<string, CplDbItem> = new Map();

    const upsertCplMap = (cpl: number): CplMapItem => {
        const r = cplMap.get(cpl);
        if (r) return r;
        const r2 = { items: [] };
        cplMap.set(cpl, r2);
        freeCplManager.removeId(cpl);
        return r2;
    };

    try {
        oldSavedCpls = readFileSync(cplTablePath, "utf-8");
        const f = cplItemsFromStr(oldSavedCpls);
        for (const dbItem of f) {
            cplMap.set(dbItem.cpl, { dbItem, items: [] });
            dbByAnchorKey.set(dbItem.anchorKey, dbItem);
            freeCplManager.removeId(dbItem.cpl);
        }
        console.log(`Reading cpls from ${cplTablePath}`);
    } catch (e: any) {
        if (e.code !== "ENOENT") console.error(`Failed to read cpls from ${cplTablePath}`, e);
        cplMap.clear();
    }

    const zeroCpls: Set<CplItem> = new Set();
    const badCpls: Set<CplItem> = new Set();
    const cplRefs: Set<CplRefItem> = new Set();

    let totalFixes = 0;

    const fileFilter = (filePath: string): boolean => {
        if (!filePath.endsWith(".ts") && !filePath.endsWith(".js") && (!settings.addTxtExtension || !filePath.endsWith(".txt"))) return false;
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
        for (let cplMonGenFile of ycplmonGeneratedFiles) {
            if (posixPath.endsWith(cplMonGenFile)) {
                return false;
            }
        }

        return true;
    };

    const changeCplItemNum = (cplItem: CplItem) => {
        let suggestedId = dbByAnchorKey.get(cplItem.anchorKey)?.cpl;
        if (suggestedId) {
            // Check that suggestedId is still free and if it's not than ignore it
            const mapItem = cplMap.get(suggestedId);
            if (mapItem?.items.length) {
                suggestedId = undefined;
            }
        }

        const newCplNum = suggestedId || freeCplManager.newId();
        const newCpl = fromNumCpl(newCplNum);
        const oldRec = cplMap.get(cplItem.cpl);
        if (oldRec) {
            const oldIndex = oldRec.items.indexOf(cplItem);
            oldRec.items.splice(oldIndex, 1);
        }
        cplItem.cplPart.replaceWith(newCpl);
        cplItem.cpl = newCplNum;
        const mapItem = upsertCplMap(cplItem.cpl);
        fix_ylog_on(cplItem);

        mapItem.items.push(cplItem);
        const ybTextTransformer = cplItem.cplPart.parent as YbTextTransformer;
        ybTextTransformer.changedCpls++;
        changedFiles.add(ybTextTransformer);
        badCpls.delete(cplItem);
    };

    const files: Map<string, YbTextTransformer> = new Map();
    const changedFiles: Set<YbTextTransformer> = new Set();

    readDirRecursive(settings.srcPath, (dirPath: string, dirent: Dirent): boolean => {
        const absoluteFilePath = toLinuxPath(joinPath(dirPath, dirent.name));
        if (dirent.name === "node_modules" || dirent.name === "lib") {
            return false;
        }

        if (dirent.isDirectory()) {
            return true;
        }

        if (settings.workspaces && !absoluteFilePath.includes("packages")) {
            return false;
        }

        if (!fileFilter(absoluteFilePath)) return false;

        const content = readFileSync(absoluteFilePath, "utf-8");
        try {
            const relativeFilePath = toRelPath(absoluteFilePath);
            const ybTextTransformer = newYbTextTransformer(content, relativeFilePath);
            files.set(relativeFilePath, ybTextTransformer);

            for (const cplItem of ybTextTransformer.cpls) {
                if (!cplItem.cpl) {
                    zeroCpls.add(cplItem);
                } else {
                    const mapItem = upsertCplMap(cplItem.cpl);
                    fix_ylog_on(cplItem);

                    mapItem.items.push(cplItem);
                    if (!cplItem.cpl || mapItem.items.length > 1) {
                        if (mapItem.items.length == 2) {
                            badCpls.add(mapItem.items[0]);
                        }
                        badCpls.add(cplItem);
                    }
                }
            }

            for (const cplRefItem of ybTextTransformer.cplRefs) {
                if (!cplRefItem) {
                    continue;
                }

                const mapItem = upsertCplMap(cplRefItem.cpl);
                cplRefs.add(cplRefItem);
            }
        } catch (e: any) {
            console.error(absoluteFilePath, " - error processing file ", e);
        }

        return false;
    });

    for (const cplItem of zeroCpls) {
        changeCplItemNum(cplItem);
    }
    zeroCpls.clear();

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
                        changeCplItemNum(item);
                    }
                }
            }
        }
    }

    // Refresh cpl refs' text
    for (const cplRefItem of cplRefs) {
        const mapItem = cplMap.get(cplRefItem.cpl);
        if (mapItem?.items.length === 1) {
            cplRefItem.cplItem = mapItem.items[0];
            cplRefItem.cplItem.refs.push(cplRefItem);

            if (cplRefItem.cplItem && cplRefItem.refPart.getStr().length > CPL_REF_FULL_LEN) {
                const newString = makeRefStr(cplRefItem);
                if (newString !== cplRefItem.refPart.getStr()) {
                    cplRefItem.refPart.parent.lengthVariation += newString.length + cplRefItem.refPart.getStr().length;
                    cplRefItem.refPart.replaceWith(newString);
                }
            }
        }
    }

    const unfixedCpls: Set<number> = new Set();

    // Replace zero cpls with new values
    for (const cplItem of badCpls) {
        unfixedCpls.add(cplItem.cpl);
    }

    for (const ybTextTransformer of changedFiles) {
        if (ybTextTransformer.isChanged()) {
            if (ybTextTransformer.lengthDifference() > ybTextTransformer.lengthVariation)
                console.error(
                    `${ybTextTransformer.filePath} - ERROR processing file - generated length (${
                        ybTextTransformer.toString().length
                    }) differs from original length (${ybTextTransformer.getFullSourceString().length}), allowedVariation = ${
                        ybTextTransformer.lengthVariation
                    }`,
                );
            else
                try {
                    writeFileSync(toAbsPath(ybTextTransformer.filePath), ybTextTransformer.toString(), "utf-8");
                    if (settings.logEachFixedFile) console.log(`${ybTextTransformer.filePath} - fixed ${ybTextTransformer.changedCpls} cpls `);
                    totalFixes += ybTextTransformer.changedCpls;
                } catch (e: any) {
                    console.error(`${ybTextTransformer.filePath} - ERROR FAILED TO WRITE fix for ${ybTextTransformer.changedCpls} cpls `, e);
                    try {
                        writeFileSync(toAbsPath(ybTextTransformer.filePath), ybTextTransformer.getFullSourceString(), "utf-8");
                    } catch (e2) {
                        console.error("Failed to revert file to original code!");
                    }
                }
        }
    }

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

    let cplDb;
    let missingScenarios = "";
    if (logicViolation) {
        console.warn(`CODE00654011 Many records on one cpl. Shouldn't be here! Cpl= ${logicViolation}`);
        logicViolations.push(logicViolation);
    } else {
        const newSavedCpls = cplItemsToStr(cplItemsForSaving);
        if (writeFileIfChangedSync(cplTablePath, newSavedCpls, oldSavedCpls)) {
            console.log(`Written cpls to ${cplTablePath}`);
        }

        const newCplDbStr = JSON.stringify((cplDb = makeCplDbContent(cplItemsForSaving)), undefined, 4);
        if (writeFileIfChangedSync(cplDbPath, newCplDbStr)) {
            console.log(`Written cpls to ${cplTablePath}`);
        }

        const missingScenariosStr = (missingScenarios = makeMissingScenarios(cplItemsForSaving, cplRefs));
        if (writeFileIfChangedSync(missingScenariosPath, missingScenariosStr)) {
            console.log(`Written missing scenarios to ${cplTablePath}`);
        }
    }

    console.log(`Fixed total ${totalFixes} cpls in ${changedFiles.size} files`);
    if (unfixedCpls.size) {
        console.error(`Found invalid cpls, cant fix them:\n${[...unfixedCpls].map((cpl) => fromNumCpl(cpl)).join("\n")}\n\n`);
    }
    console.timeEnd(`Finished in`);
    return { logicViolations, cplDb, missingScenarios };
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
    dbItem?: CplDbItem;
    items: CplItem[];
}
export type CplMap = Map<number, CplMapItem>;

export function toNumCpl(cpl: string): number {
    return +cpl.slice(4);
}

export function fromNumCpl(numCpl: number): string {
    return "CODE" + ("" + (numCpl + 100000000)).slice(1);
}
