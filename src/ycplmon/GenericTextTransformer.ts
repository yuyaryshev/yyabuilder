// Tasks
//      Split file into parts
//      Many splitters
//          - cpl
//          - lines
//          - inprint clauses
//      Replace/change any parts
//      Regenerate the file from changed parts

import { StrRef } from "./strRef.js";
import { getRegExpDictMatches, RegExpDictMatch, RegExpDict } from "./GenericTextTransformer_funcs.js";
import { strPosConverter } from "./strPosToRC.js";

export interface SplitByOpts {
    firstOnly?: boolean;
    lastOnly?: boolean;
    maxDistance?: number;
}

export interface PartsLimiterOpts<TTYPE extends string = string> {
    maxCount?: number;
    maxLength?: number;
    onlyWhileThisTags?: (TTYPE | undefined)[];
    untilThisTags?: (TTYPE | undefined)[];
    skipOtherThanThisTags?: (TTYPE | undefined)[];
}

export interface StrFromPartsOpts<TTYPE extends string = string> extends PartsLimiterOpts<TTYPE> {
    onlyLastNChars?: number;
    onlyFirstNChars?: number;
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
    public lengthVariation: number = 0; // Not used inside GenericTextTransformer

    private _size = 1;
    private _first;
    private _last;
    private _isChanged: boolean = false;
    private _lengthDifference: number = 0;
    public _touched: boolean = false;
    public readonly filePath: string;
    public readonly fullSourceString: string;
    public readonly sourceStrPosConverter;
    private _newContentString: string = "";

    constructor(s: string, filePath: string, regExpDict?: RegExpDict) {
        this.filePath = filePath;
        this.fullSourceString = s;
        this.sourceStrPosConverter = strPosConverter(s);
        this._first = new GenericTextTransformerPart<TTYPE>(this, s, 0, undefined, []);
        this._last = this._first;
        if (regExpDict) {
            this._first.splitBy(regExpDict);
        }
    }

    size() {
        return this._size;
    }

    first() {
        return this._first;
    }

    last() {
        return this._last;
    }

    getFilePath() {
        return this.filePath;
    }

    getFullSourceString() {
        return this.fullSourceString;
    }

    __replaceWith(oldPart: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        this._touched = true;
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

        if (this._first === oldPart) {
            this._first = newParts[0];
        }
        if (this._last === oldPart) {
            this._last = newParts[newParts.length - 1];
        }
        this._size += newParts.length - 1;
    }

    __addAfter(anchor: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        this._touched = true;

        let prevPart = anchor;
        for (let newPart of newParts) {
            prevPart.m_next = newPart;
            newPart.m_prev = prevPart;
            prevPart = newPart;
        }
        if (this._last === anchor) {
            this._last = prevPart;
        }
        this._size += newParts.length;
    }

    __addBefore(anchor: GenericTextTransformerPart<TTYPE>, newParts: GenericTextTransformerPart<TTYPE>[]) {
        this._touched = true;

        let nextPart = anchor;
        for (let i = newParts.length - 1; i >= 0; i--) {
            const newPart = newParts[i];
            nextPart.m_prev = newPart;
            newPart.m_next = nextPart;
            nextPart = newPart;
        }
        if (this._first === anchor) {
            this._first = nextPart;
        }
        this._size += newParts.length;
    }

    __remove(part: GenericTextTransformerPart<TTYPE>) {
        this._touched = true;

        if (!part.m_prev && !part.m_next) {
            return;
            //throw new Error(`CODE00000000 ERROR This part is detached from list!`);
        }

        if (part.m_prev) {
            part.m_prev.m_next = part.m_next;
        }

        if (part.m_next) {
            part.m_next.m_prev = part.m_prev;
        }

        if (part === this._first) {
            if (part === this._last) {
                this._first = new GenericTextTransformerPart<TTYPE>(this, "", 0, undefined, []);
                this._last = this._first;
            } else {
                if (!part.m_next) {
                    throw new Error(`CODE00000000 ERROR Internal error. This part should have 'm_next', because the list isn't empty!`);
                }
                this._first = part.m_next;
            }
        } else if (part === this._last) {
            if (!part.m_prev) {
                throw new Error(`CODE00000000 ERROR Internal error. This part should have 'm_next', because the list isn't empty!`);
            }
            this._last = part.m_prev;
        }

        delete part.m_prev;
        delete part.m_next;
        this._size--;
    }

    *iterate(tag?: TTYPE) {
        let i = 0;
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this._first; current; current = current.m_next) {
            if (tag && current.t !== tag) {
                continue;
            }
            yield current;
        }
    }

    forEach(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => void) {
        let i = 0;
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this._first; current; current = current.m_next) {
            callback(current, i++);
        }
    }

    map<R>(callback: (part: GenericTextTransformerPart<TTYPE>, index: number) => R): R[] {
        let i = 0;
        const r: R[] = [];
        for (let current: GenericTextTransformerPart<TTYPE> | undefined = this._first; current; current = current.m_next) {
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
            let current: GenericTextTransformerPart<TTYPE> | undefined = this._first;
            current;
            current = current.m_next as GenericTextTransformerPart<TTYPE> | undefined
        ) {
            const r = callback(current, i);
            current.replaceWith(r);
        }
    }

    __maybeRemakeStr() {
        if (this._touched) {
            this._newContentString = this.map((p) => p.s).join("");
            this._isChanged = this._newContentString !== this.fullSourceString;
            this._lengthDifference = this._newContentString.length - this.fullSourceString.length;
            this._touched = false;
        }
    }

    toString(): string {
        this.__maybeRemakeStr();
        return this._newContentString;
    }

    toStrings(): string[] {
        return this.map((p) => p.s);
    }

    toPlain(): GenericTextTransformerPartPlain<TTYPE>[] {
        return this.map((p) => p.toPlain());
    }

    joinPartsBetween(
        startingPart: GenericTextTransformerPart<TTYPE> | undefined,
        endingPart: GenericTextTransformerPart<TTYPE> | undefined,
    ): GenericTextTransformerPart<TTYPE> {
        if (!startingPart) {
            if (!endingPart) {
                throw new Error(`CODE00000000 Starting and ending parts cant empty togather!`);
            }

            let currentPart = endingPart.prev();
            if (!currentPart) {
                throw new Error(`CODE00000000 Invalid ending part!`);
            }
            while (currentPart.prev() !== undefined) {
                currentPart.joinPrev();
            }
            return currentPart;
        }
        let currentPart = startingPart.next();
        if (!currentPart) {
            throw new Error(`CODE00000000 Invalid staring part!`);
        }
        while (currentPart.next() !== endingPart) {
            currentPart.joinNext();
        }
        return currentPart;
    }

    isChanged() {
        this.__maybeRemakeStr();
        return this._isChanged;
    }

    lengthDifference() {
        this.__maybeRemakeStr();
        return this._lengthDifference;
    }
}

export interface GenericTextTransformerPartPlain<TTYPE extends string> {
    sourcePos: number;
    s: string;
    t?: TTYPE;
    captures?: string[];
}

export class GenericTextTransformerPart<TTYPE extends string> {
    public m_next: GenericTextTransformerPart<TTYPE> | undefined;
    public m_prev: GenericTextTransformerPart<TTYPE> | undefined;

    public readonly parent: GenericTextTransformer<TTYPE>;
    public sourcePos: number;
    public s: string;
    public t?: TTYPE;
    public captures: string[];

    constructor(parent: GenericTextTransformer<TTYPE>, s: string, sourcePos: number, t: TTYPE | undefined, captures: string[]) {
        this.sourcePos = sourcePos;
        this.parent = parent;
        this.s = s;
        if (t !== undefined) {
            this.t = t;
        }
        this.captures = captures || [];
    }

    getFilePath() {
        return this.parent.filePath;
    }

    getFullSourceString() {
        return this.parent.fullSourceString;
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

    getSourceLineAndPos(offset: number = 0) {
        return this.parent.sourceStrPosConverter.fromPos(this.sourcePos + offset);
    }

    getSourceLine(offset: number = 0) {
        return this.getSourceLineAndPos(offset).r;
    }

    getSourceLinePos(offset: number = 0) {
        return this.getSourceLineAndPos(offset).c;
    }

    getSourcePos() {
        return this.sourcePos;
    }

    getSourcePosAddrStr() {
        const { r, c } = this.parent.sourceStrPosConverter.fromPos(this.sourcePos);
        return `${this.parent.filePath}:${r}:${c}:${this.sourcePos}`;
    }

    remove() {
        this.parent.__remove(this);
    }

    clear() {
        this.s = "";
    }

    replaceWith(s: string | boolean | undefined) {
        this.parent._touched = true;

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

    findNext(tag: string): GenericTextTransformerPart<TTYPE> | undefined;
    findNext(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined;
    findNext(
        tagOrCallBack: string | string[] | ((part: GenericTextTransformerPart<TTYPE>) => boolean | undefined),
    ): GenericTextTransformerPart<TTYPE> | undefined {
        if (typeof tagOrCallBack === "string") {
            let current: GenericTextTransformerPart<TTYPE> | undefined = this;
            while (true) {
                if (!current) {
                    return undefined;
                }
                current = current.m_next;
                if (current?.getTag() === tagOrCallBack) {
                    return current;
                }
            }
        }

        if (Array.isArray(tagOrCallBack)) {
            let current: GenericTextTransformerPart<TTYPE> | undefined = this;
            while (true) {
                if (!current) {
                    return undefined;
                }
                current = current.m_next;
                if (tagOrCallBack.includes(current?.getTag()!)) {
                    return current;
                }
            }
        }

        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_next;
            if (current && tagOrCallBack(current)) {
                return current;
            }
        }
    }

    findPrev(tag: string): GenericTextTransformerPart<TTYPE> | undefined;
    findPrev(callBack: (part: GenericTextTransformerPart<TTYPE>) => boolean | undefined): GenericTextTransformerPart<TTYPE> | undefined;
    findPrev(
        tagOrCallBack: string | string[] | ((part: GenericTextTransformerPart<TTYPE>) => boolean | undefined),
    ): GenericTextTransformerPart<TTYPE> | undefined {
        if (typeof tagOrCallBack === "string") {
            let current: GenericTextTransformerPart<TTYPE> | undefined = this;
            while (true) {
                if (!current) {
                    return undefined;
                }
                current = current.m_prev;
                if (current?.getTag() === tagOrCallBack) {
                    return current;
                }
            }
        }

        if (Array.isArray(tagOrCallBack)) {
            let current: GenericTextTransformerPart<TTYPE> | undefined = this;
            while (true) {
                if (!current) {
                    return undefined;
                }
                current = current.m_prev;
                if (tagOrCallBack.includes(current?.getTag()!)) {
                    return current;
                }
            }
        }

        let current: GenericTextTransformerPart<TTYPE> | undefined = this;
        while (current) {
            current = current.m_prev;
            if (current && tagOrCallBack(current)) {
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

        let sourcePos = this.sourcePos;
        for (const item of getRegExpDictMatches(this.s, dict)) {
            if (item.prefix) {
                newParts.push(new GenericTextTransformerPart<TTYPE>(this.parent, item.prefix, sourcePos, undefined, []));
                sourcePos += item.prefix.length;
            }

            if (item.match) {
                newParts.push(
                    new GenericTextTransformerPart<TTYPE>(this.parent, item.match[0], sourcePos, item.match.t as TTYPE, item.match.slice(1)),
                );
                sourcePos += item.match[0].length;
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
        return this;
    }

    joinPrev() {
        if (!this.m_prev) {
            return this;
        }
        return this.m_prev.joinNext();
    }

    strBefore(maxLength: number, opts: StrFromPartsOpts<TTYPE> = {}) {
        return strFromParts<TTYPE>(this.prevParts(), { onlyLastNChars: maxLength, maxLength, ...opts });
    }

    strAfter(maxLength: number, opts: StrFromPartsOpts<TTYPE> = {}) {
        return strFromParts<TTYPE>(this.nextParts(), { onlyFirstNChars: maxLength, maxLength, ...opts });
    }

    strAround(maxLengthBefore: number, maxLengthAfter0?: number, opts: StrFromPartsOpts<TTYPE> = {}) {
        const maxLengthAfter = maxLengthAfter0 !== undefined ? maxLengthAfter0 : maxLengthBefore;
        return this.strBefore(maxLengthBefore, opts) + this.strAfter(maxLengthAfter, opts);
    }
}

export function* partsLimiter<TTYPE extends string>(
    partsGenerator: Generator<GenericTextTransformerPart<TTYPE>>,
    opts: PartsLimiterOpts<TTYPE> = {},
) {
    let currentLength = 0;
    let currentCount = 0;
    for (const p of partsGenerator) {
        if (opts.skipOtherThanThisTags) {
            if (!opts.skipOtherThanThisTags.includes(p.getTag())) {
                continue;
            }
        }

        if (opts.onlyWhileThisTags) {
            if (!opts.onlyWhileThisTags.includes(p.getTag())) {
                break;
            }
        }

        if (opts.untilThisTags) {
            if (opts.untilThisTags.includes(p.getTag())) {
                break;
            }
        }

        if (opts.maxCount !== undefined && currentCount > opts.maxCount) {
            break;
        }

        if (opts.maxLength !== undefined && currentLength > opts.maxLength) {
            break;
        }

        yield p;
    }
}

export function partsStr(parts: Iterable<GenericTextTransformerPart<any>>) {
    return [...parts].map((part) => part.getStr()).join();
}

export function strFromParts<TTYPE extends string>(
    partsGenerator: Generator<GenericTextTransformerPart<TTYPE>>,
    opts: StrFromPartsOpts = {},
): string {
    let s = partsStr(partsLimiter(partsGenerator, opts));
    if (opts.onlyFirstNChars !== undefined) {
        return s.slice(0, opts.onlyFirstNChars);
    }

    if (opts.onlyLastNChars !== undefined) {
        return s.slice(-opts.onlyLastNChars);
    }

    return s;
}
