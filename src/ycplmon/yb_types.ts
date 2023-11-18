import { GenericTextTransformer, GenericTextTransformerPart } from "./GenericTextTransformer";

const ybRegExpDict = {
    cpl: /CODE(\d{8})/g,
} as const;

export type YbTt = keyof typeof ybRegExpDict;
export class YbTextTransformer extends GenericTextTransformer<YbTt, GenericTextTransformerPart<YbTt, any>> {
    constructor(s: string) {
        super(s, ybRegExpDict);
    }
}

export function newYbTextTransformer(s: string): YbTextTransformer {
    const ybTextTransformer = new YbTextTransformer(s);
    for (const item of ybTextTransformer.iterate("cpl")) {
    }

    return ybTextTransformer;
}
