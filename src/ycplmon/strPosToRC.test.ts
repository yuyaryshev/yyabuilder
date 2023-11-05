import { expect } from "chai";
import { slowButSimplePosToRc, strPosConverter, strPosToRC, strRCToPos } from "./strPosToRC.js";
import { joinCplFile, splitCplFile } from "./ycplmonLib";

describe("strPosToRC", () => {
    it("strPosToRCConverter.linesSE", () => {
        expect(strPosConverter(`\n123 abc \r\n  абв\t `).linesSE).to.deep.equal([
            { s: 0, e: 0 },
            { s: 1, e: 9 },
            { s: 11, e: 18 },
        ]);

        expect(strPosConverter(`dd\n123 abc \r\n  абв\t `).linesSE).to.deep.equal([
            { s: 0, e: 2 },
            { s: 3, e: 11 },
            { s: 13, e: 20 },
        ]);

        expect(strPosConverter(``).linesSE).to.deep.equal([{ s: 0, e: 0 }]);
        expect(strPosConverter(`a`).linesSE).to.deep.equal([{ s: 0, e: 1 }]);
        expect(strPosConverter(`\n`).linesSE).to.deep.equal([
            { s: 0, e: 0 },
            { s: 1, e: 1 },
        ]);
        expect(strPosConverter(`\n\n`).linesSE).to.deep.equal([
            { s: 0, e: 0 },
            { s: 1, e: 1 },
            { s: 2, e: 2 },
        ]);
        expect(strPosConverter(`\r\n\r\r\n`).linesSE).to.deep.equal([
            { s: 0, e: 0 },
            { s: 2, e: 2 },
            { s: 3, e: 3 },
            { s: 5, e: 5 },
        ]);
    });

    it("strPosToRCConverter.fromPos", () => {
        const conv = strPosConverter(`dd\n123 abc \r\n  абв\t `);
        expect(conv.fromPos(5)).to.deep.equal({ r: 2, c: 3 });
    });

    it("strPosToRCConverter.toPos", () => {
        const conv = strPosConverter(`dd\n123 abc \r\n  абв\t `);
        expect(conv.toPos(2, 3)).to.deep.equal(5);
    });

    it("strPosToRC", () => {
        expect(strPosToRC(`dd\n123 abc \r\n  абв\t `, 5)).to.deep.equal({ r: 2, c: 3 });
    });

    it("strRCToPos", () => {
        expect(strRCToPos(`dd\n123 abc \r\n  абв\t `, 2, 3)).to.equal(5);
    });

    it("edgeCases-1", () => {
        const s = "aaa\nbbb\nccc";
        const r_etalon = slowButSimplePosToRc(s, 7);
        const rr2 = strPosConverter(s).fromPos(7);
        expect(rr2).to.deep.equal(r_etalon);
    });

    it("edgeCases", () => {
        function testLine(s: string) {
            for (let i = 0; i < s.length; i++) {
                try {
                    const r_etalon = slowButSimplePosToRc(s, i);
                    const rr = strPosToRC(s, i);
                    expect(rr).to.deep.equal(r_etalon);

                    const rr2 = strPosConverter(s).fromPos(i);
                    expect(rr2).to.deep.equal(r_etalon);
                } catch (e: any) {
                    console.log(`FAILED FOR CASE:
                        const s = ${JSON.stringify(s)};
                        const r_etalon = slowButSimplePosToRc(s, ${i});
                        const rr = strPosToRC(s, ${i});
                        expect(rr).to.deep.equal(r_etalon);
                        
                        const rr2 = strPosConverter(s).fromPos(${i});
                        expect(rr2).to.deep.equal(r_etalon);
                    `);
                    throw e;
                }
            }
        }

        testLine("This is a sample text with CODE" + " and CODE" + "0000 and CODE" + "00000164 and CODE" + "00000165 codes.");
        testLine("This is a sample text with CODE" + " and CODE" + "0000");
        testLine("");
        testLine(" ");
        testLine("CODE" + "00000166 and CODE" + "00000167 codes.");
        testLine("CODE" + "00000168CODE" + "00000169");
        testLine("CODE" + "00000170");
        testLine("CODE" + "0000CODE000001710009");
        testLine("aaa\nbbb\nccc");
    });
});
