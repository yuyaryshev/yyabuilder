import { GenericTextTransformer, GenericTextTransformerPart } from "./GenericTextTransformer.js";
import { CPL_FULL_LEN, toNumCpl } from "./ycplmonLib.js";
import { createHash } from "node:crypto";
import { findQuotEnd, parseCplMessage, ParseCplMessageResult } from "./string_funcs.js";
import { jsCommentRegexp } from "./jsCommentRegexp.js";

const ybRegExpDict = {
    cpl: /CODE(\d{8})/g,
    cplref: /CODR(\d{8})/g,
    ylog_on: /(YLOG_on[(]\s*)(\d{9})(\s*[)])/g,
    inprint: /[@]INPRINT[_](START|END)(.*)\n/g,
    todo: /([/][/][ ]*TODO)(.*)\n/g,
} as const;

export const cplRefPrefix = "CODR";

export type YbTt = keyof typeof ybRegExpDict;

export interface CplItem {
    cplPart: GenericTextTransformerPart<YbTt>;

    cpl: number;
    cplPosKey: string;
    anchorKey: string;

    message?: string;
    severity?: string;
    expectation?: string;
    ylog_name?: string;
    cpl_comment?: string;
    ylog_on_part?: GenericTextTransformerPart<YbTt>;

    refs: CplRefItem[];
}

export interface CplRefItem {
    refPart: GenericTextTransformerPart<YbTt>;
    cplItem?: CplItem;

    cpl: number;
}

export interface InprintItem2 {
    startingPart: GenericTextTransformerPart<YbTt>;
    middlePart: GenericTextTransformerPart<YbTt>;
    endingPart: GenericTextTransformerPart<YbTt>;
}

export interface TodoItem {
    part: GenericTextTransformerPart<YbTt>;
}

export type ParseCplMessageFromPartResult = ParseCplMessageResult & { ylog_on_part?: GenericTextTransformerPart<YbTt> };

export function parseCplMessageFromPart(cplPart: GenericTextTransformerPart<YbTt>): ParseCplMessageFromPartResult {
    const s = cplPart.parent.getFullSourceString();
    const maxP = cplPart.next()?.next()?.getSourcePos() || s.length;
    let p = cplPart.getSourcePos();
    const r: ParseCplMessageFromPartResult = parseCplMessage(s, p, maxP);
    if (r.ylog_name) {
        const midPart = cplPart.prev();
        if (midPart) {
            const ylog_on_part = midPart.prev();
            if (ylog_on_part && ylog_on_part.getTag() === "ylog_on") {
                let ss = midPart.getStr().split(jsCommentRegexp).join("");
                if (ss.split("\n").length < 3 && ss.split(";").length <= 1) {
                    r.ylog_on_part = ylog_on_part;
                }
            }
        }
    }
    return r;
}

export class YbTextTransformer extends GenericTextTransformer<YbTt> {
    public cpls: CplItem[] = [];
    public cplRefs: CplRefItem[] = [];
    public changedCpls: number = 0;
    public inprints: InprintItem2[] = [];
    public todos: TodoItem[] = [];

    constructor(s: string, filePath: string) {
        super(s, filePath, ybRegExpDict);

        for (const part of this.iterate()) {
            switch (part.getTag()) {
                case undefined:
                    break;
                case "cpl": {
                    const textAround = part.strAround(200);

                    const cplItem: CplItem = {
                        cplPart: part,
                        cpl: toNumCpl(part.getStr()),
                        cplPosKey: makeCplPosKey(filePath, part.getSourcePos()),
                        anchorKey: makeAnchorKey(textAround),
                        refs: [],
                        ...parseCplMessageFromPart(part),
                    };
                    this.cpls.push(cplItem);
                    break;
                }

                case "cplref": {
                    const cplRefItem: CplRefItem = {
                        refPart: part,
                        cpl: toNumCpl(part.getStr()),
                    };
                    this.cplRefs.push(cplRefItem);
                    break;
                }

                case "inprint": {
                    if (part.getCaptures()[0] !== "START") {
                        break;
                    }
                    const startingPart = part;
                    const endingPart = startingPart.findNext("inprint");
                    if (!endingPart) {
                        console.warn(
                            `CODE00000000 No ending for INPRINT block in ${filePath} line ${part.getSourceLine()}. This block will be ignored!`,
                        );
                        break;
                    }
                    const middlePart = startingPart.parent.joinPartsBetween(startingPart, endingPart);

                    const inprintItem: InprintItem2 = { startingPart, middlePart, endingPart };
                    this.inprints.push(inprintItem);
                    break;
                }

                case "todo": {
                    const todoItem: TodoItem = { part };
                    this.todos.push(todoItem);
                    break;
                }
            }
        }
    }
}

export function newYbTextTransformer(s: string, filePath: string): YbTextTransformer {
    return new YbTextTransformer(s, filePath);
}

const splitByCplRegexNoCapture = /CODE\d{8}/g;
const whitespaceRegex = /[ ][\t][\n][\r]/g;
const ylogOnNoCapture = /YLOG_on[(]\s*\d{9}\s*[)]/g;

export function makeAnchorKey(textAround: string) {
    const anchor = textAround.split(splitByCplRegexNoCapture).join("").split(ylogOnNoCapture).join("").split(whitespaceRegex).join("");
    const anchorKey = createHash("sha256").update(anchor).digest("hex");
    return anchorKey;
}

export function makeCplPosKey(filePath: string, pos: number): string {
    return `${filePath}:${pos}`;
}
