import { expectDeepEqual } from "../expectDeepEqual.js";
import { resolve, join } from "path";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { newYbTextTransformer } from "./yb_types.js";
import { thisPackageDir } from "../thisPackageDir.js";
import { fix_cpls } from "./ycplmonLib.js";

function genStr(len: number, genStrConst = "0123456789 "): string {
    let r = genStrConst;
    while (r.length < len) {
        r += genStrConst;
    }
    return r.slice(0, len);
}

function getTestFolder(testName: string) {
    return `${thisPackageDir()}/src/ycplmon/folders_for_tests/${testName}`;
}

function writeFiles0(testFolder: string, dataFiles: string[]) {
    for (let i = 0; i < dataFiles.length; i++) {
        const dataFile = addSplitters(dataFiles[i]);
        const filePath = `${testFolder}/file${i}.txt`;
        writeFileSync(filePath, dataFile, "utf-8");
    }
}

function readFiles0(testFolder: string) {
    const r: string[] = [];
    for (let i = 0; i < 100; i++) {
        const filePath = `${testFolder}/file${i}.txt`;
        try {
            r[i] = removeSpliiters(readFileSync(filePath, "utf-8"));
        } catch (e: any) {
            if (e.code === "ENOENT") {
                return r;
            }
            throw e;
        }
    }
    return r;
}

function utDeepClone(a: any) {
    return JSON.parse(JSON.stringify(a));
}

function setupTest(pthis: any, testFolderName: string) {
    const testName = pthis?.test?.title || "";
    if (!testName) {
        throw new Error(`CODE00000000 No test name!`);
    }
    const testFolder = getTestFolder(testFolderName || testName);
    if (!testFolder) {
        throw new Error(`CODE00000000 No testFolder name!`);
    }
    const writeFiles = (dataFiles: string[]) => writeFiles0(testFolder, dataFiles);
    const deleteCplsDb = () => {
        try {
            unlinkSync(`${testFolder}/cpl.clsv`);
        } catch (e: any) {}
    };
    const readFiles = () => readFiles0(testFolder);
    return { testName, testFolder, writeFiles, readFiles, deleteCplsDb };
}

const splitter = genStr(220, "S1234567890S ");
const addSplitters = (s: string) => s.split(" S ").join(` ${splitter} `);
const removeSpliiters = (s: string) => s.split(` ${splitter} `).join(" S ");

const cplDataFiles = (...n: number[]) => [
    `aaaa S aaaa2 CODE${"0000000" + n[0]} bbbb S bbbb2\n` +
        `cccc S cccc2 CODE${"0000000" + n[1]} dddd S dddd2\n` +
        `zzzz S zzzz2 CODE${"0000000" + n[2]} xxxx S xxxx2\n`,
    `eeee S eeee2 if(YLOG_on( 10000000${n[3]})) YLOG_message(\"CODE${"0000000" + n[3]}","E", "test message"); ffff S ffff2)\n`,
    `hhhh S hhhh2 CODE${"0000000" + n[4]} kkkk S kkkk2\n` + `oooo S oooo2 CODE${"0000000" + n[5]} pppp S pppp2\n`,
];

const otherFixCplOpts = {
    addTxtExtension: true,
    // logEachFixedFile?: boolean;

    // Not used
    dbPath: "",
    rebuildDb: false,
    watch: false,
};

describe("tests_on_folders.test.ts", () => {
    it("replace_zeroes", function () {
        const { testFolder, writeFiles, readFiles, deleteCplsDb } = setupTest(this, "test_folder1");

        deleteCplsDb();
        writeFiles(cplDataFiles(0, 0, 0, 1, 0, 0));

        fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });

        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));
    });

    it("fixing_one_dublicate", function () {
        const { testFolder, writeFiles, readFiles, deleteCplsDb } = setupTest(this, "test_folder2");

        deleteCplsDb();
        writeFiles(cplDataFiles(0, 0, 0, 1, 0, 0));

        fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));

        writeFiles(cplDataFiles(1, 3, 4, 1, 5, 6));

        const { logicViolations } = fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));
        expectDeepEqual(logicViolations, []);
    });

    it("fixing_many_dublicates", function () {
        const { testFolder, writeFiles, readFiles, deleteCplsDb } = setupTest(this, "test_folder2");

        deleteCplsDb();
        writeFiles(cplDataFiles(0, 0, 0, 1, 0, 0));

        fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));

        writeFiles(cplDataFiles(1, 1, 1, 1, 5, 6));

        const { logicViolations } = fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));
        expectDeepEqual(logicViolations, []);
    });

    it("not_fixing_ambiguities", function () {
        const { testFolder, writeFiles, readFiles, deleteCplsDb } = setupTest(this, "test_folder2");

        deleteCplsDb();
        writeFiles(cplDataFiles(0, 0, 0, 1, 0, 0));

        fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(readFiles(), cplDataFiles(2, 3, 4, 1, 5, 6));

        writeFiles(cplDataFiles(1, 1, 1, 9, 5, 0));

        const { logicViolations } = fix_cpls({ srcPath: testFolder, ...otherFixCplOpts });
        expectDeepEqual(logicViolations, ["CODE00000001"]);
        expectDeepEqual(readFiles(), cplDataFiles(1, 1, 1, 9, 5, 6));
    });
});
