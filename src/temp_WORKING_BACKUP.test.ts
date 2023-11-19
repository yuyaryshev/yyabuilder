import { expectDeepEqual } from "./expectDeepEqual.js";

const splitByCplRegex = /(CODE\d{8})/g;

export interface SplitAndMarkDict {
    [key: string]: RegExp;
}

export interface TaggedStringPart {
    s: string;
    t?: string;
}

function findDictMatch(s: string, p: number, dict: SplitAndMarkDict) {
    let leastIndex = s.length;
    let lastMatch: any | undefined;
    for (const key in dict) {
        const regex = dict[key];
        regex.lastIndex = p;
        const match: (RegExpExecArray & { t?: string }) | null = regex.exec(s);

        if (match && match.index < leastIndex) {
            match.t = key;
            leastIndex = match.index;
            lastMatch = match;
        }
    }

    if (!lastMatch) {
        return {
            p: s.length,
            prefix: s.substring(p, leastIndex),
            tail: "",
        };
    }

    const np = leastIndex + lastMatch[0].length;
    return {
        match: lastMatch,
        p: np,
        prefix: s.substring(p, leastIndex),
    };
}

function splitAndMark(s: string, dict: SplitAndMarkDict): TaggedStringPart[] {
    const strLen = s.length;
    let parts = [];
    let p = 0;

    while (p < strLen) {
        const rr = findDictMatch(s, p, dict);
        if (rr.prefix.length) {
            parts.push({ s: rr.prefix });
        }

        if (rr.match) {
            parts.push({ s: rr.match[0], t: rr.match.t });
        }
        p = rr.p;
    }

    return parts;
}

const exampleString = `alksndmjasdfn CODE00000000 111 lksndlne CODE11111111 2222 slmsdlkmsdlkm MXCD666666 3333 FD55555XC 444`;
const expectedR = [
    { s: `alksndmjasdfn ` },
    { s: `CODE00000000`, t: "cpl" },
    { s: ` 111 lksndlne ` },
    { s: `CODE11111111`, t: "cpl" },
    { s: ` 2222 slmsdlkmsdlkm ` },
    { s: `MXCD666666`, t: "mxcd" },
    { s: ` 3333 ` },
    { s: `FD55555XC`, t: "fdxc" },
    { s: ` 444` },
];

describe("temp.test.ts", () => {
    it("splitAndMarkFunction", () => {
        const splitAndMarkDict = {
            cpl: /CODE(\d{8})/g,
            mxcd: /MXCD(\d{6})/g,
            fdxc: /FD(\d{5})XC/g,
        };
        const r: TaggedStringPart[] = splitAndMark(exampleString, splitAndMarkDict);

        // Checking BR1, BR2,  BR3
        expectDeepEqual(r, expectedR);

        const regeneratedString = r.map((part) => part.s).join("");

        // Checking BR4
        expectDeepEqual(regeneratedString, exampleString);
    });
});
