// Tasks
//      Split file into parts
//      Many splitters
//          - cpl
//          - lines
//          - inprint clauses
//      Replace/change any parts
//      Regenerate the file from changed parts

import { StrRef } from "./strRef";
import { getRegExpDictMatches, RegExpDictMatch, RegExpDict } from "./GenericTextTransformer_funcs";

export interface SplitByOpts {
    firstOnly?: boolean;
    lastOnly?: boolean;
    maxDistance?: number;
}

interface DLLNode<TDLLNode extends DLLNode<any> = DLLNode<any>> {
    m_next: TDLLNode | undefined;
    m_prev: TDLLNode | undefined;
}

function linkTwoDllNodes(a: DLLNode, b: DLLNode) {
    a.m_next = b;
    b.m_prev = a;
}

// This function makes implementation of doubly linked lists absurdly easy to understand
function linkThreeDllNodes(first: DLLNode | undefined, mid: DLLNode, last: DLLNode | undefined) {
    if (first) {
        first.m_next = mid;
        mid.m_prev = first;
    }

    if (last) {
        mid.m_next = last;
        last.m_prev = mid;
    }
}

export class GenericTextTransformer<TTYPE extends string> {
    _size: number = 1;
    public first: GenericTextTransformerPart<TTYPE>;
    public last: GenericTextTransformerPart<TTYPE>;
    constructor(s: string, regExpDict?: RegExpDict) {
        this.first = new GenericTextTransformerPart<TTYPE, any>(this, s);
        this.last = this.first;
        if (regExpDict) {
            this.first.splitBy(regExpDict);
        }
    }

    size() {
        return this._size;
    }

    __replaceWith(oldPart: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        if (!newParts.length) {
            this.__remove(oldPart);
            return;
        }

        let prevPart = oldPart.m_prev;
        delete oldPart.m_prev;
        delete oldPart.m_next;
        for (let newPart of newParts) {
            if (prevPart) {
                prevPart.m_next = newPart;
            }
            newPart.m_prev = prevPart;
            prevPart = newPart;
        }

        if (this.first === oldPart) {
            this.first = newParts[0];
        }
        if (this.last === oldPart) {
            this.last = newParts[newParts.length - 1];
        }
        this._size += newParts.length - 1;
    }

    __addAfter(anchor: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        let prevPart = anchor;
        for (let newPart of newParts) {
            prevPart.m_next = newPart;
            newPart.m_prev = prevPart;
            prevPart = newPart;
        }
        if (this.last === anchor) {
            this.last = prevPart;
        }
        this._size += newParts.length;
    }

    __addBefore(anchor: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        let nextPart = anchor;
        for (let i = newParts.length - 1; i >= 0; i--) {
            const newPart = newParts[i];
            nextPart.m_prev = newPart;
            newPart.m_next = nextPart;
            nextPart = newPart;
        }
        if (this.first === anchor) {
            this.first = nextPart;
        }
        this._size += newParts.length;
    }

    __remove(part: GenericTextTransformerPart<TTYPE>) {
        if (!part.m_prev && !part.m_next) {
            throw new Error(`CODE00000000 ERROR This part is detached from list!`);
        }

        if (part.m_prev) {
            part.m_prev.m_next = part.m_next;
        }

        if (part.m_next) {
            part.m_next.m_prev = part.m_prev;
        }

        if (part === this.first) {
            if (part === this.last) {
                this.first = new GenericTextTransformerPart<TTYPE, any>(this, "");
                this.last = this.first;
            } else {
                if (!part.m_next) {
                    throw new Error(`CODE00000000 ERROR Internal error. This part should have 'm_next', because the list isn't empty!`);
                }
                this.first = part.m_next;
            }
        } else if (part === this.last) {
            if (!part.m_prev) {
                throw new Error(`CODE00000000 ERROR Internal error. This part should have 'm_next', because the list isn't empty!`);
            }
            this.last = part.m_prev;
        }

        delete part.m_prev;
        delete part.m_next;
        this._size--;
    }

    *iterate(tag?: TTYPE) {
        let i = 0;
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this.first; current; current = current.m_next) {
            if (tag && current.t !== tag) {
                continue;
            }
            yield current;
        }
    }

    forEach(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => void) {
        let i = 0;
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this.first; current; current = current.m_next) {
            callback(current, i++);
        }
    }

    map<R>(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => R): R[] {
        let i = 0;
        const r: R[] = [];
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this.first; current; current = current.m_next) {
            const rr = callback(current, i++);
            if (rr !== undefined) {
                r.push(rr);
            }
        }
        return r;
    }

    update(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => string | boolean | undefined) {
        let i = 0;
        for (
            let current: GenericTextTransformerPart<TTYPE> | undefined = this.first;
            current;
            current = current.m_next as GenericTextTransformerPart<TTYPE> | undefined
        ) {
            const r = callback(current, i);
            current.replaceWith(r);
        }
    }

    toString(): string {
        return this.map((s) => s).join("");
    }

    toPlain(): GenericTextTransformerPartPlain<TTYPE>[] {
        return this.map((p) => p.toPlain());
    }
}

export interface GenericTextTransformerPartPlain<TTYPE extends string> {
    s: string;
    t?: TTYPE;
    captures?: string[];
}

export class GenericTextTransformerPart<TTYPE extends string> {
    public m_next: GenericTextTransformerPart<TTYPE> | undefined;
    public m_prev: GenericTextTransformerPart<TTYPE> | undefined;

    public readonly parent: GenericTextTransformer<TTYPE>;
    public s: string;
    public t?: TTYPE;
    public captures: string[];

    constructor(parent: GenericTextTransformer<TTYPE>, s: string, t?: TTYPE, captures?: string[]) {
        this.parent = parent;
        this.s = s;
        if (t !== undefined) {
            this.t = t;
        }
        this.captures = captures || [];
    }

    getStr() {
        return this.s;
    }

    getTag(): TTYPE | undefined {
        return this.t;
    }

    getCaptures(): string[] {
        return this.captures;
    }

    remove() {
        this.parent.__remove(this);
    }

    clear() {
        this.s = "";
    }

    replaceWith(s: string | boolean | undefined) {
        if (typeof s === "string") {
            this.s = s;
            return;
        }
        if (!s) {
            this.remove();
        }
    }

    next(): GenericTextTransformerPart<TTYPE> | undefined {
        return this.m_next;
    }

    prev(): GenericTextTransformerPart<TTYPE> | undefined {
        return this.m_prev;
    }

    findNext(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined {
        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_next;
            if (current && callBack(current)) {
                return current;
            }
        }
    }

    findPrev(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined {
        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_prev;
            if (current && callBack(current)) {
                return current;
            }
        }
    }

    *nextParts(): Generator<GenericTextTransformerPart<TTYPE>> {
        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_next;
            if (current) {
                yield current;
            }
        }
    }

    *prevParts(): Generator<GenericTextTransformerPart<TTYPE>> {
        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_prev;
            if (current) {
                yield current;
            }
        }
    }

    toPlain(): GenericTextTransformerPartPlain<TTYPE> {
        const { parent, m_prev, m_next, ...allTheRest } = this;
        return allTheRest;
    }

    splitBy(dict: RegExpDict, opts: SplitByOpts = {}) {
        const newParts: GenericTextTransformerPart<TTYPE>[] = [];

        if (opts.firstOnly) {
            // TODO splitBy opts.firstOnly
            throw new Error(`CODE00000000 splitBy opts.firstOnly @notImplemented`);
        }

        if (opts.lastOnly) {
            // TODO splitBy opts.lastOnly
            throw new Error(`CODE00000000 splitBy opts.lastOnly @notImplemented`);
        }

        if (opts.maxDistance) {
            // TODO splitBy opts.maxDistance
            throw new Error(`CODE00000000 splitBy opts.maxDistance @notImplemented`);
        }

        for (const item of getRegExpDictMatches(this.s, dict)) {
            if (item.prefix) {
                newParts.push(new GenericTextTransformerPart<TTYPE>(this.parent, item.prefix));
            }

            if (item.match) {
                newParts.push(new GenericTextTransformerPart<TTYPE>(this.parent, item.match[0], item.match.t as TTYPE, item.match.slice(1)));
            }
        }

        this.s = "";
        this.parent.__replaceWith(this, newParts);
    }

    joinNext() {
        if (!this.m_next) {
            return;
        }

        this.s += this.m_next.s;
        this.m_next.remove();
    }

    joinPrev() {
        if (!this.m_prev) {
            return;
        }

        this.s = this.m_prev.s + this.s;
        this.m_prev.remove();
    }
}
