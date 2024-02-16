import { expectDeepEqual } from "../expectDeepEqual.js";
import { splitAndMark, TaggedStringPart } from "./GenericTextTransformer_funcs.js";
import { GenericTextTransformer } from "./GenericTextTransformer.js";

const splitByCplRegex = /(CODE\d{8})/g;

const exampleString = `alksndmjasdfn CODE` + `00000000 111 lksndlne CODE` + `11111111 2222 slmsdlkmsdlkm MXCD666666 3333 FD55555XC 444`;
const expectedR = () => [
    { s: `alksndmjasdfn `, sourcePos: 0, captures: [] },
    { s: `CODE` + `00000000`, t: "cpl", sourcePos: 14, captures: ["00000000"] },
    { s: ` 111 lksndlne `, sourcePos: 26, captures: [] },
    { s: `CODE` + `11111111`, t: "cpl", captures: ["11111111"], sourcePos: 40 },
    { s: ` 2222 slmsdlkmsdlkm `, sourcePos: 52, captures: [] },
    { s: `MXCD666666`, t: "mxcd", captures: ["666666"], sourcePos: 72 },
    { s: ` 3333 `, sourcePos: 82, captures: [] },
    { s: `FD55555XC`, t: "fdxc", captures: ["55555"], sourcePos: 88 },
    { s: ` 444`, sourcePos: 97, captures: [] },
];

describe("GenericTextTransformer.test.ts", () => {
    it("GenericTextTransformer", () => {
        const regExpDict = {
            cpl: /CODE(\d{8})/g,
            mxcd: /MXCD(\d{6})/g,
            fdxc: /FD(\d{5})XC/g,
        };
        const tr = new GenericTextTransformer(exampleString, "test.js", "test.js", regExpDict);

        tr.forEach((part) => {
            if (part.t === "cpl") {
                const rr = part.findNext((p2) => p2.t === "cpl")?.s;
                if (rr) (part as any).nextCpl = rr;
            }
        });

        const etalon: any = expectedR();
        etalon[1].nextCpl = "CODE" + "11111111";
        expectDeepEqual(tr.toPlain(), etalon);
    });

    it("simple split", () => {
        const regExpDict = {
            cpl: /CODE(\d{8})/g,
            mxcd: /MXCD(\d{6})/g,
            fdxc: /FD(\d{5})XC/g,
        };
        const tr = new GenericTextTransformer(exampleString, "test.js", "test.js", regExpDict);

        expectDeepEqual(tr.toPlain(), expectedR());
    });
});
