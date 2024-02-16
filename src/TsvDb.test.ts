// TsvDb.test.ts
import { TsvDb, TsvDbOpts, TsvTypeDef } from "./TsvDb.js";
import fs, { unlinkSync } from "fs";
import { expectDeepEqual } from "./expectDeepEqual.js";

const tsvPath = (suffix: string = "") => `test_files/test_tsv_db${suffix}.tsv`;
const dbPath = (suffix: string = "") => `test_files/test_tsv_db${suffix}.db`;

const tsvDbConfig = (suffix: string = ""): TsvDbOpts => {
    const r: TsvDbOpts = {
        tsvFilePath: tsvPath(suffix),
        typeCol: undefined,
        typeDefs: { default: { pkCols: ["cpl"] } },
        orderby: ["file_path", "source_pos", "cpl"],
        columns: ["cpl", "file_path", "source_pos", "severity"],
    };
    return r;
};

function deleteTestTsv(suffix: string = "") {
    try {
        unlinkSync(tsvPath(suffix));
    } catch (e: any) {}
}

describe("TsvDb.test.ts", () => {
    it("TsvDb - insert", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("1"));

        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        const r = await tsvDb.getAll();
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
            "CODE00001436",
        );
    });

    it("TsvDb - update", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("2"));

        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        const r0 = await tsvDb.getAll();
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
            "CODE00001437",
        );

        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        const r = await tsvDb.getAll();
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
            "CODE00001438",
        );
    });

    it("TsvDb - export & import", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("3"));

        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });
        {
            const r = await tsvDb.getAll();
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
                "CODE00001439",
            );
        }

        await tsvDb.exportTsv();

        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });
        {
            const r = await tsvDb.getAll();
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
                "CODE00001440",
            );
        }

        await tsvDb.importTsv();
        {
            const r = await tsvDb.getAll();
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
                "CODE00001441",
            );
        }
    });

    it("TsvDb - markAllAsDeleted", async function () {
        const tsPartSize = 20;
        const deleted_ts = new Date().toISOString().slice(0, tsPartSize);
        const tsvDb = new TsvDb(tsvDbConfig("4"));

        deleteTestTsv();
        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Sample text",
            path: "/sample/path",
            package: "SamplePackage",
            class: "SampleClass",
            function: "sampleFunction",
            severity: "I",
        });

        await tsvDb.markAllAsDeleted();

        const r = await tsvDb.getAll();
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
            "CODE00001442",
        );
    });

    it("TsvDb - export & import keep unknown data", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("5"));

        const fileContents = `cpl\tseverity\tother_data1\ncccc12345678\tI\tddd1`;
        fs.writeFileSync(tsvPath("5"), fileContents, "utf-8");

        await tsvDb.importTsv();

        {
            const r = await tsvDb.getAll();
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
                "CODE00001443",
            );
        }
        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        await tsvDb.exportTsv();
        const newContents = fs.readFileSync(tsvPath("5"), "utf-8");

        expectDeepEqual<any>(newContents.split("ddd1").length, 2);
    });

    it("TsvDb - export & import delete unknown data if opts", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("6"));

        const fileContents = `cpl\tseverity\tother_data1\ncccc12345678\tI\tddd1`;
        fs.writeFileSync(tsvPath("6"), fileContents, "utf-8");

        await tsvDb.importTsv({ deleteUnknownColumns: true });

        {
            const r = await tsvDb.getAll();
            expectDeepEqual<any>(
                r,
                [
                    {
                        cpl: "cccc12345678",
                        severity: "I",
                        tsv_line: 1,
                    },
                ],
                "CODE00001444",
            );
        }
        await tsvDb.upsert({
            cpl: "cccc12345678",
            text: "Changed text",
        });

        await tsvDb.exportTsv();
        const newContents = fs.readFileSync(tsvPath("6"), "utf-8");

        expectDeepEqual<any>(newContents.split("ddd1").length, 1);
    });

    it("TsvDb - no orderby", async function () {
        const tsvDb = new TsvDb(Object.assign(tsvDbConfig("7"), { orderby: [] }));

        await tsvDb.upsert({
            cpl: "cccc000000003",
            text: "ccc",
        });

        await tsvDb.upsert({
            cpl: "cccc000000001",
            text: "aaa",
        });

        await tsvDb.upsert({
            cpl: "cccc000000002",
            text: "bbb",
        });

        expectDeepEqual<any>(tsvDb.getAll(), [
            {
                cpl: "cccc000000003",
                text: "ccc",
            },
            {
                cpl: "cccc000000001",
                text: "aaa",
            },
            {
                cpl: "cccc000000002",
                text: "bbb",
            },
        ]);
    });

    it("TsvDb - orderby", async function () {
        const tsvDb = new TsvDb(tsvDbConfig("8"));

        await tsvDb.upsert({
            cpl: "cccc000000003",
            text: "ccc",
            file_path: "f2",
            source_pos: 1,
        });

        await tsvDb.upsert({
            cpl: "cccc000000001",
            text: "aaa",
            file_path: "f1",
            source_pos: 1,
        });

        await tsvDb.upsert({
            cpl: "cccc000000002",
            text: "bbb",
            file_path: "f1",
            source_pos: 2,
        });

        expectDeepEqual<any>(tsvDb.getAll(), [
            {
                cpl: "cccc000000001",
                text: "aaa",
                file_path: "f1",
                source_pos: 1,
            },
            {
                cpl: "cccc000000002",
                text: "bbb",
                file_path: "f1",
                source_pos: 2,
            },
            {
                cpl: "cccc000000003",
                text: "ccc",
                file_path: "f2",
                source_pos: 1,
            },
        ]);
    });
});
