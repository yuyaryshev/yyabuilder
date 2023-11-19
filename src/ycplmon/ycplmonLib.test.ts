import { expectDeepEqual } from "../expectDeepEqual.js";
import { readFileSync } from "fs";
import { newYbTextTransformer } from "./yb_types.js";

const genStrConst = "0123456789 ";
function genStr(len: number): string {
    let r = genStrConst;
    while (r.length < len) {
        r += genStrConst;
    }
    return r.slice(0, len);
}

describe("ycplmonLib.test.ts", () => {
    it("splitByCpl", () => {
        const s: string = "This is a sample text with CODE and CODE" + "0000 and CODE" + "00000158 and CODE" + "00000159 codes.";
        const r0 = newYbTextTransformer(s, "unused.js");

        expectDeepEqual(r0.toStrings(), [
            "This is a sample text with CODE and CODE0000 and ",
            "CODE" + "00000158",
            " and ",
            "CODE" + "00000159",
            " codes.",
        ]);

        const r = r0.toPlain();

        expectDeepEqual(r[0], {
            sourcePos: 0,
            s: "This is a sample text with CODE and CODE0000 and ",
            captures: [],
        });

        expectDeepEqual(r[1], {
            sourcePos: 49,
            s: "CODE00000158",
            t: "cpl",
            captures: ["00000158"],
        });

        const r2 = r0.toString();
        expectDeepEqual(r2, s);
    });

    it("joinCplFile", () => {
        const s: string = "This is a sample text with CODE" + " and CODE" + "0000 and CODE" + "00000162 and CODE" + "00000163 codes.";
        const r = newYbTextTransformer(s, "unused.js").toString();
        expectDeepEqual(r, s);
    });

    it("edgeCases", () => {
        function testLine(s: string) {
            try {
                const r = newYbTextTransformer(s, "unused.js").toString();
                expectDeepEqual(r, s);
            } catch (e: any) {
                console.log(`CODE00035200 Failed case:\n
                it("failedEdgeCase", () => {
                    const s = ${JSON.stringify(s)};
                    const r = newYbTextTransformer(s, "unused.js").toString();
                    expectDeepEqual(r,s);
                });
                `);
                throw e;
            }
        }

        testLine("This is a sample text with CODE" + " and CODE" + "0000 and CODE" + "00000164 and CODE" + "00000165 codes.");
        testLine(
            `This is a sample text with ${genStr(400)} CODE` +
                ` and ${genStr(400)} CODE` +
                `0000 and ${genStr(400)} CODE` +
                "00000164 and CODE" +
                "00000165 codes.",
        );
        testLine("This is a sample text with CODE" + " and CODE" + "0000");
        testLine("");
        testLine(" ");
        testLine("CODE" + "00000166 and CODE" + "00000167 codes.");
        testLine("CODE" + "00000168CODE" + "00000169");
        testLine("CODE" + "00000170");
        testLine("CODE" + "0000CODE000001570009");
    });

    it("file1_from_odb.txt", () => {
        const fileContent = readFileSync(`./src/test_data/file1_from_odb.txt`, "utf-8");
    });
});
