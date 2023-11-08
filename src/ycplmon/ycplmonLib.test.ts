import { expect } from "chai";
import { joinCplFile, splitCplFile } from "./ycplmonLib.js";

describe("ycplmonLib.test.ts", () => {
    it("splitByCpl", () => {
        const s: string = "This is a sample text with CODE and CODE" + "0000 and CODE" + "00000158 and CODE" + "00000159 codes.";
        const r = splitCplFile("unused.js", s);
        expect(r).to.deep.equal({
            prefixText: "This is a sample text with CODE and CODE0000 and ",
            parts: [
                {
                    anchorKey: "abf5fbab9e84eadd59667467d4f562f3f4ad313f3a561a54d1288b97c9e5172d",
                    cpl: 158,
                    cplPosKey: "unused.js:49",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 50,
                    pos: 49,
                    tail: " and ",
                },
                {
                    cpl: 159,
                    cplPosKey: "unused.js:66",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 67,
                    pos: 66,
                    tail: " codes.",
                    anchorKey: "abf5fbab9e84eadd59667467d4f562f3f4ad313f3a561a54d1288b97c9e5172d",
                },
            ],
        });

        const r2 = joinCplFile(r);
        expect(r2).to.deep.equal(s);
    });

    it("joinCplFile", () => {
        const s: string = "This is a sample text with CODE" + " and CODE" + "0000 and CODE" + "00000162 and CODE" + "00000163 codes.";
        const r = joinCplFile(splitCplFile("unused.js", s));
        expect(r).to.deep.equal(s);
    });

    it("edgeCases", () => {
        function testLine(s: string) {
            const r = joinCplFile(splitCplFile("unused.js", s));
            expect(r).to.deep.equal(s);
        }

        testLine("This is a sample text with CODE" + " and CODE" + "0000 and CODE" + "00000164 and CODE" + "00000165 codes.");
        testLine("This is a sample text with CODE" + " and CODE" + "0000");
        testLine("");
        testLine(" ");
        testLine("CODE" + "00000166 and CODE" + "00000167 codes.");
        testLine("CODE" + "00000168CODE" + "00000169");
        testLine("CODE" + "00000170");
        testLine("CODE" + "0000CODE000001710009");
    });
});
