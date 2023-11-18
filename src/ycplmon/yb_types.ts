import { GenericTextTransformer, GenericTextTransformerPart } from "./GenericTextTransformer";
import {toNumCpl} from "./ycplmonLib";

const ybRegExpDict = {
    cpl: /CODE(\d{8})/g,
    ylog_on: /YLOG_on[(](\d{9})[)]/g,
    inprint: /[@]INPRINT[_](START|END)/g,
} as const;

export type YbTt = keyof typeof ybRegExpDict;

interface CplItem2 {
    cplMain:GenericTextTransformerPart<YbTt>;

    cpl: number;
    filePath: string;
    fileLine: number;
    linePos: number;
    pos: number;
    prefix: StrRef;
    tail: StrRef;
    cplPosKey: string;
    anchorKey?: string;
}

export class YbTextTransformer extends GenericTextTransformer<YbTt, GenericTextTransformerPart<YbTt, any>> {
    public cpls: CplItem[] = [];

    constructor(s: string, filePath:string) {
        super(s, ybRegExpDict);

        for (const cplMain of this.iterate("cpl")) {
            const cplItem: CplItem2 = {
                cplMain,
                cpl: toNumCpl(cplMain.getStr()),
                filePath,
                fileLine: cplMain.getLine(),
                linePos: cplMain.getLinePos()
                pos: cplMain.getPos(),

                // TODO fields below
                prefix: StrRef;
                tail: StrRef;
                cplPosKey: string;
                anchorKey?: string;
            }
        }
    }
}

export function newYbTextTransformer(s: string): YbTextTransformer {
    const ybTextTransformer = new YbTextTransformer(s);

    return ybTextTransformer;
}
