import { CPL_FULL_LEN } from "./ycplmonLib.js";
import { isCplAt } from "./isCpl.js";

export function unescapeString(s: string) {
    return s.split("\\").join("");
}

export function findQuotEnd(s: string, p0: number, quot: string): string {
    let p = p0;
    let r = "";
    while (true) {
        let np = s.indexOf(quot, p);
        if (np < 0) {
            return "";
        }
        if (s[np - 1] === "\\") {
            p = np + 1;
            continue;
        }
        return unescapeString(s.slice(p0, np));
    }
}

export function parseNextStringAfterComma(s: string, p0: number, maxP: number): [string | undefined, number] {
    let p = p0;
    while (p < maxP && s[p] !== ",") {
        p++;
    }
    p++;

    while (s[p] === " " || s[p] === "\t" || s[p] === "\r" || s[p] === "\n") {
        p++;
    }

    if (s[p] === "'" || s[p] === '"' || s[p] === "`") {
        return [findQuotEnd(s, p + 1, s[p]).trim(), p];
    }
    return [undefined, p0];
}

const ylog_name_prefix = "Y" + "LOG_";

export interface ParseCplMessageResult {
    message?: string;
    severity?: string;
    expectation?: string;
    ylog_name?: string;
    cpl_comment?: string;
}

const cplCommentPrefix = "// CODE ";
const cplCommentRegExp = /[/][/] CODE (.*)\n/g;

function addFromCplComment(r: ParseCplMessageResult, cplComment: string | undefined): ParseCplMessageResult {
    if (cplComment === undefined) {
        return r;
    }

    let [expectation, severity, ...messageParts] = cplComment.split(" ");

    if (severity.length > 1) {
        messageParts.unshift(severity);
        severity = "";
        if (expectation.length > 2) {
            messageParts.unshift(expectation);
            expectation = "";
        }
    }
    const message = messageParts.join(" ");

    if (!r.message) {
        r.message = message;
    }

    if (!r.severity && severity) {
        r.severity = severity;
    }

    if (!r.expectation && expectation) {
        r.expectation = expectation;
    }

    return r;
}

export function parseCplMessage(s: string, p: number, maxP: number) {
    const cpl = s.slice(p, p + 12);
    let r: ParseCplMessageResult = {};
    try {
        // find ylog_name
        for (let pp = p; pp >= 0; pp--) {
            if (s[pp] === ")" || s[pp] === ";") {
                break;
            }
            if (p - pp > 100) {
                break;
            }
            if (s[pp] === "Y" && s.substring(pp, pp + ylog_name_prefix.length) === ylog_name_prefix) {
                r.ylog_name = s.slice(pp, p).split("(")[0];
            }
        }

        // find cpl_comment
        for (let pp = p - 5; pp >= 0; pp--) {
            if (p - pp > 400) {
                break;
            }

            if (s[pp] === "C") {
                if (isCplAt(s, pp)) {
                    break;
                }
            }

            if (s[pp] === "/" && s.substring(pp, pp + cplCommentPrefix.length) === cplCommentPrefix) {
                r.cpl_comment = s
                    .slice(pp + cplCommentPrefix.length, p)
                    .split("\n")[0]
                    .trim();
                break;
            }
        }

        const cplQuot = s[p - 1];
        const message1 = findQuotEnd(s, p, cplQuot);
        if (message1.length > CPL_FULL_LEN) {
            r.message = message1.slice(CPL_FULL_LEN).trim();
            return addFromCplComment(r, r.cpl_comment);
        }

        p += CPL_FULL_LEN;
        {
            const [resStr, np] = parseNextStringAfterComma(s, p, maxP);
            p = np;

            if (resStr && resStr.length === 1) {
                r.severity = resStr;
                const [resStr2, np2] = parseNextStringAfterComma(s, p, maxP);
                if (resStr2 && resStr2.length > 1) {
                    r.message = resStr2;
                    return addFromCplComment(r, r.cpl_comment);
                }
            }

            if (resStr && resStr.length > 1) {
                r.message = resStr;
                return addFromCplComment(r, r.cpl_comment);
            }
        }
        return addFromCplComment(r, r.cpl_comment);
    } catch (e: any) {
        return {};
    }
}
