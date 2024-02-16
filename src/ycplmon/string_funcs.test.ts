import { expectDeepEqual } from "../expectDeepEqual.js";
import { slowButSimplePosToRc, strPosConverter, strPosToRC, strRCToPos } from "./strPosToRC.js";
import { findQuotEnd, parseCplMessage } from "./string_funcs.js";

const parseCplMessageTst = (s: string, pos: number) => {
    return parseCplMessage(s + " aaaa", pos, s.length);
};

describe("string_funcs", () => {
    it("findQuotEnd tick", () => {
        const r = findQuotEnd(`abc \` deb`, 0, "`");
        expectDeepEqual(r, "abc ");
    });

    it("findQuotEnd double", () => {
        const r = findQuotEnd(`abc \" deb`, 0, '"');
        expectDeepEqual(r, "abc ");
    });

    it("findQuotEnd single", () => {
        const r = findQuotEnd(`abc \' deb`, 0, "'");
        expectDeepEqual(r, "abc ");
    });

    it("findQuotEnd tick with escape", () => {
        const r = findQuotEnd(`abc \\\` \` deb`, 0, "`");
        expectDeepEqual(r, "abc ` ");
    });

    it("findQuotEnd double with escape", () => {
        const r = findQuotEnd(`abc \\\" \" deb`, 0, '"');
        expectDeepEqual(r, 'abc " ');
    });

    it("findQuotEnd singl ewith escape", () => {
        const r = findQuotEnd(`abc \\\' \' deb`, 0, "'");
        expectDeepEqual(r, "abc ' ");
    });

    it("parseCplMessage - should extract message from the same string with double quotes", () => {
        const s = 'Some text "CODE00123456 Example message" some other text';
        const r = parseCplMessageTst(s, 11);
        expectDeepEqual(r, { message: "Example message" });
    });

    it("parseCplMessage - should extract message from the next string with single quotes", () => {
        const s = "Text 'CODE0076432', 'Next message' and more";
        const r = parseCplMessageTst(s, 6);
        expectDeepEqual(r, { message: "Next message" });
    });

    it("parseCplMessage - should handle backtick quotes in the same string", () => {
        const s = `More text \`CODE00011223 Message in backticks\` continuation`;
        const r = parseCplMessageTst(s, 11);
        expectDeepEqual(r, { message: "Message in backticks" });
    });

    it("parseCplMessage - should handle mixed delimiters with message in the next string", () => {
        const s = 'Different "CODE' + '00987654", `separate message` text';
        const r = parseCplMessageTst(s, 11);
        expectDeepEqual(r, { message: "separate message" });
    });

    it("parseCplMessage - with severity", () => {
        const s = 'Different "CODE' + '00987654","E", `separate message` text';
        const r = parseCplMessageTst(s, 11);
        expectDeepEqual(r, { message: "separate message", severity: "E" });
    });

    it("parseCplMessage - with ylog function", () => {
        const s = 'Another YLOG_message("CODE' + '00987654","E", `separate message` text';
        const r = parseCplMessageTst(s, 23);
        expectDeepEqual(r, { message: "separate message", severity: "E", ylog_name: "YLOG_message" });
    });
});
