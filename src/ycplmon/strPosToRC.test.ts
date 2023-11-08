import { expect } from "chai";
import { slowButSimplePosToRc, strPosConverter, strPosToRC, strRCToPos } from "./strPosToRC.js";

describe("strPosToRC", () => {
    it("strPosToRCConverter.linesSE", () => {
        expect(strPosConverter(`\n123 abc \r\n  абв\t `).linesSE).to.deep.equal([0, 1, 11]);
        expect(strPosConverter(`dd\n123 abc \r\n  абв\t `).linesSE).to.deep.equal([0, 3, 13]);
        expect(strPosConverter(``).linesSE).to.deep.equal([0]);
        expect(strPosConverter(`a`).linesSE).to.deep.equal([0]);
        expect(strPosConverter(`\n`).linesSE).to.deep.equal([0, 1]);
        expect(strPosConverter(`\n\n`).linesSE).to.deep.equal([0, 1, 2]);
        expect(strPosConverter(`\r\n\r\r\n`).linesSE).to.deep.equal([0, 2, 3, 5]);
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

    it("edgeCase", () => {
        const s = "aaa\r\nbbb\r\nccc";
        const r_etalon = slowButSimplePosToRc(s, 10);
        const rr = strPosToRC(s, 10);
        expect(rr).to.deep.equal(r_etalon);

        const rr2 = strPosConverter(s).fromPos(10);
        expect(rr2).to.deep.equal(r_etalon);

        const rr3 = strRCToPos(s, rr.r, rr.c);
        expect(rr3).to.deep.equal(10);

        const rr4 = strPosConverter(s).toPos(rr.r, rr.c);
        expect(rr4).to.deep.equal(10);
    });

    it("edgeCases", () => {
        function testLine(s: string) {
            for (let i = 0; i < s.length; i++) {
                let isNl = s[i] === "\n" || s[i] === "\r";
                try {
                    const r_etalon = slowButSimplePosToRc(s, i);
                    const rr = strPosToRC(s, i);
                    expect(rr).to.deep.equal(r_etalon);

                    const rr2 = strPosConverter(s).fromPos(i);
                    expect(rr2).to.deep.equal(r_etalon);

                    if (!isNl) {
                        const rr3 = strRCToPos(s, rr.r, rr.c);
                        expect(rr3).to.deep.equal(i);

                        const rr4 = strPosConverter(s).toPos(rr.r, rr.c);
                        expect(rr4).to.deep.equal(i);
                    }
                } catch (e: any) {
                    console.log(
                        `FAILED FOR CASE:
                        const s = ${JSON.stringify(s)};
                        const r_etalon = slowButSimplePosToRc(s, ${i});
                        const rr = strPosToRC(s, ${i});
                        expect(rr).to.deep.equal(r_etalon);
                        
                        const rr2 = strPosConverter(s).fromPos(${i});
                        expect(rr2).to.deep.equal(r_etalon);
                    ` +
                            (!isNl
                                ? `
                        const rr3 = strRCToPos(s, rr.r, rr.c);
                        expect(rr3).to.deep.equal(${i});

                        const rr4 = strPosConverter(s).toPos(rr.r, rr.c);
                        expect(rr4).to.deep.equal(${i});
                    `
                                : ""),
                    );
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
        testLine("aaa\nbbb\nccc\n");
        testLine("aaa\rbbb\rccc");
        testLine("aaa\rbbb\rccc\r");
        testLine("aaa\r\nbbb\r\nccc");
        testLine("aaa\r\nbbb\r\nccc\r\n");

        testLine("aaa\r\n\r\nccc\r\n");
        testLine("aaa\r\n\r\n\r\n");
        testLine("\r\n\r\n\r\n");

        testLine("aaa\n\nccc\n");
        testLine("aaa\n\n\n");
        testLine("\n\n\n");

        testLine("aaa\r\rccc\r");
        testLine("aaa\r\r\r");
        testLine("\r\r\r");
    });
});
