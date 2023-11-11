// Tasks
//      Split file into parts
//      Many splitters
//          - cpl
//          - lines
//          - inprint clauses
//      Replace/change any parts
//      Regenerate the file from changed parts

import { StrRef } from "./strRef";
import { getRegExpDictMatches, SplitAndMarkDict } from "./GenericTextTransformer_funcs";

export class GenericTextTransformer<TTYPE extends string, PART_TYPE extends GenericTextTransformerPart<TTYPE> = GenericTextTransformerPart<TTYPE>> {
    public readonly parts: PART_TYPE[] = [];
    constructor(s: string, dict: SplitAndMarkDict) {
        for (const item of getRegExpDictMatches(s, dict)) {
            if (item.prefix) {
                this.parts.push(new GenericTextTransformerPart<TTYPE>(this, item.prefix) as PART_TYPE);
            }

            if (item.match) {
                this.parts.push(new GenericTextTransformerPart<TTYPE>(this, item.match[0], item.match.t as TTYPE, item.match.slice(1)) as PART_TYPE);
            }
        }
    }

    map<R>(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => R): R[] {
        const r: R[] = [];
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i];
            const rr = callback(part, i);
            if (rr !== undefined) {
                r.push(rr);
            }
        }
        return r;
    }

    forEach(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => void) {
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i];
            callback(part, i);
        }
    }

    update(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => string | boolean | undefined) {
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i];
            const r = callback(part, i);
            part.replaceWith(r);
        }
    }

    toString(): string {
        return this.parts.map((s) => s).join("");
    }

    toPlain(): GenericTextTransformerPartPlain<TTYPE>[] {
        return this.parts.map((p) => p.toPlain());
    }
}

export interface GenericTextTransformerPartPlain<TTYPE extends string> {
    s: string;
    t?: TTYPE;
    captures?: string[];
}

export class GenericTextTransformerPart<TTYPE extends string> {
    public readonly parent: GenericTextTransformer<TTYPE>;
    public s: string;
    public t?: TTYPE;
    public captures?: string[];

    constructor(parent: GenericTextTransformer<TTYPE>, s: string, t?: TTYPE, captures?: string[]) {
        this.parent = parent;
        this.s = s;
        if (t !== undefined) {
            this.t = t;
        }
        if (captures !== undefined) {
            this.captures = captures;
        }
    }

    remove() {
        this.s = "";
    }

    replaceWith(s: string | boolean | undefined) {
        if (typeof s === "string") {
            this.s = s;
            return;
        }
        if (!s) {
            this.s = "";
        }
    }

    findNext(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined {
        for (let i = this.parent.parts.indexOf(this) + 1; i < this.parent.parts.length; i++) {
            if (callBack(this.parent.parts[i])) {
                return this.parent.parts[i];
            }
        }
    }

    findPrev(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined {
        for (let i = this.parent.parts.indexOf(this) - 1; i >= 0; i--) {
            if (callBack(this.parent.parts[i])) {
                return this.parent.parts[i];
            }
        }
    }

    *nextParts(): Generator<GenericTextTransformerPart<TTYPE>> {
        for (let i = this.parent.parts.indexOf(this) + 1; i < this.parent.parts.length; i++) {
            yield this.parent.parts[i];
        }
    }

    *prevParts(): Generator<GenericTextTransformerPart<TTYPE>> {
        for (let i = this.parent.parts.indexOf(this) - 1; i >= 0; i--) {
            yield this.parent.parts[i];
        }
    }

    toPlain(): GenericTextTransformerPartPlain<TTYPE> {
        const { parent, ...allTheRest } = this;
        return allTheRest;
    }
}
