import { expect } from "chai";
import { splitAndMark, TaggedStringPart } from "./GenericTextTransformer_funcs";
import { GenericTextTransformer } from "./GenericTextTransformer";

const splitByCplRegex = /(CODE\d{8})/g;

const exampleString = `alksndmjasdfn CODE00000000 111 lksndlne CODE11111111 2222 slmsdlkmsdlkm MXCD666666 3333 FD55555XC 444`;
const expectedR = () => [
    { s: `alksndmjasdfn ` },
    { s: `CODE00000000`, t: "cpl", captures: ["00000000"] },
    { s: ` 111 lksndlne ` },
    { s: `CODE11111111`, t: "cpl", captures: ["11111111"] },
    { s: ` 2222 slmsdlkmsdlkm ` },
    { s: `MXCD666666`, t: "mxcd", captures: ["666666"] },
    { s: ` 3333 ` },
    { s: `FD55555XC`, t: "fdxc", captures: ["55555"] },
    { s: ` 444` },
];

describe("GenericTextTransformer.test.ts", () => {
    it("GenericTextTransformer", () => {
        const regExpDict = {
            cpl: /CODE(\d{8})/g,
            mxcd: /MXCD(\d{6})/g,
            fdxc: /FD(\d{5})XC/g,
        };
        const tr = new GenericTextTransformer(exampleString, regExpDict);

        tr.forEach((part) => {
            if (part.t === "cpl") {
                const rr = part.findNext((p2) => p2.t === "cpl")?.s;
                if (rr) (part as any).nextCpl = rr;
            }
        });

        const etalon: any = expectedR();
        etalon[1].nextCpl = "CODE" + "11111111";
        expect(tr.toPlain()).to.deep.equal(etalon);
    });

    it("simple split", () => {
        const regExpDict = {
            cpl: /CODE(\d{8})/g,
            mxcd: /MXCD(\d{6})/g,
            fdxc: /FD(\d{5})XC/g,
        };
        const tr = new GenericTextTransformer(exampleString, regExpDict);

        expect(tr.toPlain()).to.deep.equal(expectedR());
    });
});
