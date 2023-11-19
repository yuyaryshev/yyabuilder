// @ts-ignore
import JSON5 from "json5";

export function makeAntiCircularReplacer(replacement: any = "[Circular]") {
    const seenValues = new Set<any>();
    return function antiCircularReplacer(k: any, v: any) {
        if (typeof v === "object" || typeof v === "function") {
            if (seenValues.has(v)) {
                return replacement;
            }
            seenValues.add(v);
        }
        return v;
    };
}

export function tryStringify(v: any, space?: number | undefined, maxLength?: number): string {
    try {
        const r = JSON5.stringify(v, makeAntiCircularReplacer(), space);
        return maxLength && typeof r === "string" ? r.substring(0, maxLength) : r;
    } catch (e: any) {
        return `CODE00000213 Failed to tryStringify failed because of ${e.message}`;
    }
}

export function tryStringifyIfDefined(v: any, space?: number | undefined, maxLength?: number): string {
    if (v === undefined) return "";
    try {
        const r = JSON5.stringify(v, makeAntiCircularReplacer(), space);
        return maxLength && typeof r === "string" ? r.substring(0, maxLength) : r;
    } catch (e: any) {
        return `CODE00000214 Failed to tryStringify failed because of ${e.message}`;
    }
}

export function tryStringifyWithPrefix(prefix: string, v: any, space?: number | undefined, maxLength?: number): string {
    if (v === undefined) return "";
    try {
        const r = JSON5.stringify(v, makeAntiCircularReplacer(), space);
        return prefix + (maxLength && typeof r === "string" ? r.substring(0, maxLength) : r);
    } catch (e: any) {
        return `CODE00000215 Failed to tryStringify failed because of ${e.message}`;
    }
}
