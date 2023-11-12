export interface RegExpDict {
    [key: string]: RegExp;
}

export interface TaggedStringPart {
    s: string;
    t?: string;
    captures?: string[];
}

export interface RegExpDictMatch {
    match?: RegExpExecArray & { t?: string };
    index: number;
    prefix: string;
}

export function* getRegExpDictMatches(s: string, dict: RegExpDict, p: number = 0): Generator<RegExpDictMatch, void, unknown> {
    while (p < s.length) {
        let leastIndex = s.length;
        let lastMatch: (RegExpExecArray & { t?: string }) | undefined = undefined;

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

        const prefix: string | undefined = p != leastIndex ? s.substring(p, leastIndex) : undefined;
        if (!lastMatch) {
            yield {
                index: s.length,
                prefix: p != leastIndex ? s.substring(p, leastIndex) : "",
            };
            return;
        }

        const op = p;
        p = leastIndex + lastMatch[0].length;

        yield {
            match: lastMatch,
            index: p,
            prefix: s.substring(op, leastIndex),
        };
    }
}

export function splitAndMark(s: string, dict: RegExpDict): TaggedStringPart[] {
    const strLen = s.length;
    let parts = [];

    for (const item of getRegExpDictMatches(s, dict)) {
        if (item.prefix) {
            parts.push({ s: item.prefix });
        }

        if (item.match) {
            parts.push({ s: item.match[0], t: item.match.t, captures: item.match.slice(1) });
        }
    }

    return parts;
}
