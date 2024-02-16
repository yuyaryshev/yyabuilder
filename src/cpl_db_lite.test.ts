// cpl_db_lite.test.ts
import fs, { unlinkSync } from "fs";
import { TsvDb, TsvTypeDef } from "./TsvDb.js";
import { makeCplDbOpts } from "./CplRecord.js";
import { expectDeepEqual } from "./expectDeepEqual.js";

const tsvPath = (suffix: string = "") => `test_files/test_cpl_db${suffix}.tsv`;
const dbPath = (suffix: string = "") => `test_files/test_cpl_db${suffix}.db`;

const cplDbConfig = (suffix: string = ""): string => tsvPath(suffix);

function deleteTestTsv(suffix: string = "") {
    try {
        unlinkSync(tsvPath(suffix));
    } catch (e: any) {}
}

function makeCplDb(suffix: string = "") {
    const r = new TsvDb(makeCplDbOpts(tsvPath(suffix)));
    return r;
}

describe("cpl_db_lite.test.ts", () => {
    it("cpl_db_lite - insert", async function () {
        let cplDb;

        cplDb = makeCplDb("1");

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        const r = await cplDb.getAll();
        expectDeepEqual<any>(
            r,
            [
                {
                    cpl: "cccc12345678",
                    text: "Sample text",
                    path: "/sample/path",
                    package: "SamplePackage",
                    class: "SampleClass",
                    function: "sampleFunction",
                    severity: "I",
                },
            ],
            "CODE00001005",
        );
    });

    it("cpl_db_lite - update", async function () {
        let cplDb;

        cplDb = makeCplDb("2");

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        const r0 = await cplDb.getAll();
        expectDeepEqual<any>(
            r0,
            [
                {
                    cpl: "cccc12345678",
                    text: "Sample text",
                    path: "/sample/path",
                    package: "SamplePackage",
                    class: "SampleClass",
                    function: "sampleFunction",
                    severity: "I",
                },
            ],
            "CODE00001006",
        );

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        const r = await cplDb.getAll();
        expectDeepEqual<any>(
            r,
            [
                {
                    cpl: "cccc12345678",
                    text: "Changed text",
                    path: "/sample/path",
                    package: "SamplePackage",
                    class: "SampleClass",
                    function: "sampleFunction",
                    severity: "I",
                },
            ],
            "CODE00001007",
        );
    });

    it("cpl_db_lite - export & import", async function () {
        let cplDb;

        cplDb = makeCplDb("3");

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });
        {
            const r = await cplDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        text: "Sample text",
                        path: "/sample/path",
                        package: "SamplePackage",
                        class: "SampleClass",
                        function: "sampleFunction",
                        severity: "I",
                    },
                ],
                "CODE00001008",
            );
        }

        await cplDb.exportTsv();

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });
        {
            const r = await cplDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        text: "Changed text",
                        path: "/sample/path",
                        package: "SamplePackage",
                        class: "SampleClass",
                        function: "sampleFunction",
                        severity: "I",
                    },
                ],
                "CODE00001431",
            );
        }

        await cplDb.importTsv();
        {
            const r = await cplDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        text: "Sample text",
                        path: "/sample/path",
                        package: "SamplePackage",
                        class: "SampleClass",
                        function: "sampleFunction",
                        severity: "I",
                        tsv_line: 1,
                    },
                ],
                "CODE00001432",
            );
        }
    });

    it("cpl_db_lite - markAllAsDeleted", async function () {
        const tsPartSize = 20;
        const deleted_ts = new Date().toISOString().slice(0, tsPartSize);
        let cplDb;

        cplDb = makeCplDb("4");

        deleteTestTsv();

        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        await cplDb.markAllAsDeleted();

        const r = await cplDb.getAll();
        if (r?.[0]?.deleted_ts) {
            expectDeepEqual<any>((r[0].deleted_ts + "").slice(0, tsPartSize), deleted_ts);
            r[0].deleted_ts = deleted_ts;
        }

        expectDeepEqual<any>(
            r,
            [
                {
                    cpl: "cccc12345678",
                    text: "Sample text",
                    path: "/sample/path",
                    package: "SamplePackage",
                    class: "SampleClass",
                    function: "sampleFunction",
                    severity: "I",
                    deleted_ts,
                },
            ],
            "CODE00001433",
        );
    });

    it("cpl_db_lite - export & import keep unknown data", async function () {
        let cplDb;

        cplDb = makeCplDb("5");

        const fileContents = `cpl\tseverity\tother_data1\ncccc12345678\tI\tddd1`;
        fs.writeFileSync(tsvPath("5"), fileContents, "utf-8");

        await cplDb.importTsv();

        {
            const r = await cplDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        severity: "I",
                        other_data1: "ddd1",
                        tsv_line: 1,
                    },
                ],
                "CODE00001434",
            );
        }
        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        await cplDb.exportTsv();
        const newContents = fs.readFileSync(tsvPath("5"), "utf-8");

        expectDeepEqual<any>(newContents.split("ddd1").length, 2);
    });

    it("cpl_db_lite - export & import delete unknown data if opts", async function () {
        let cplDb;

        cplDb = makeCplDb("6");

        const fileContents = `cpl\tseverity\tother_data1\ncccc12345678\tI\tddd1`;
        fs.writeFileSync(tsvPath("6"), fileContents, "utf-8");

        await cplDb.importTsv({ deleteUnknownColumns: true });

        {
            const r = await cplDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        severity: "I",
                        tsv_line: 1,
                    },
                ],
                "CODE00001435",
            );
        }
        await cplDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        await cplDb.exportTsv();
        const newContents = fs.readFileSync(tsvPath("6"), "utf-8");

        expectDeepEqual<any>(newContents.split("ddd1").length, 1);
    });
});
