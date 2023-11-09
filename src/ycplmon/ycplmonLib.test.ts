import { expect } from "chai";
import { joinCplFile, splitCplFile } from "./ycplmonLib.js";

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
        const r = splitCplFile("unused.js", s);
        expect(r).to.deep.equal({
            fileContents: s,
            parts: [
                {
                    anchorKey: "abf5fbab9e84eadd59667467d4f562f3f4ad313f3a561a54d1288b97c9e5172d",
                    cpl: 158,
                    cplPosKey: "unused.js:49",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 50,
                    pos: 49,
                    prefix: "This is a sample text with CODE and CODE0000 and ",
                    tail: " and ",
                },
                {
                    cpl: 159,
                    cplPosKey: "unused.js:66",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 67,
                    pos: 66,
                    prefix: "",
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

    it("splitByCpl - long", () => {
        const s =
            `This is a sample text with aaaaaaa ${genStr(400)} bbbbbbb CODE` +
            ` and cccccc ${genStr(400)} ddddddd CODE` +
            `0000 and eeeeeee ${genStr(400)} ffffff CODE` +
            `00000164 and hhhhhh ${genStr(400)} ggggggg CODE` +
            `00000165 kkkkkk ${genStr(400)} llllllll codes.`;

        const r = splitCplFile("unused.js", s);
        expect(r).to.deep.equal({
            fileContents: s,
            parts: [
                {
                    anchorKey: "d6e1039ddbf86a534564291a4f288ef0715b7c92f5350474b3a6dd90ea467360",
                    cpl: 164,
                    cplPosKey: "unused.js:1298",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 1299,
                    pos: 1298,
                    prefix: "0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123 ggggggg ",
                    tail: " and hhhhhh 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 ",
                },
                {
                    anchorKey: "58c8f7c429dff75fbe22fb216e5fe39eef0d7d5cf830e502bb52cd7224dc8aac",
                    cpl: 165,
                    cplPosKey: "unused.js:1731",
                    fileLine: 1,
                    filePath: "unused.js",
                    linePos: 1732,
                    pos: 1731,
                    prefix: " ggggggg CODE",
                    tail: " kkkkkk 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 0123 llllllll codes.",
                },
            ],
        });
    });
    it("edgeCases", () => {
        function testLine(s: string) {
            try {
                const r = joinCplFile(splitCplFile("unused.js", s));
                expect(r).to.deep.equal(s);
            } catch (e: any) {
                console.log(`CODE00035200 Failed case:\n
                it("failedEdgeCase", () => {
                    const s = ${JSON.stringify(s)};
                    const r = joinCplFile(splitCplFile("unused.js", s));
                    expect(r).to.deep.equal(s);
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
});
