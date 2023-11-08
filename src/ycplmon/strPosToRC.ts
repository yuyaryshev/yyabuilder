// USAGE
//
// Convert string position to row and column (line and position in line) and back
// strPosConverter - preset for fast conversion
//  .fromPos(pos) -> {r,c}
//  .toPos(r,c) -> pos
//
// Convenient functions
//  strPosToRC(pos) -> {r,c}
//  strRCToPos(r,c) -> pos

export function strPosConverter(s: string) {
    const l = s.length;
    const linesStarts: number[] = [0];
    let lineStart = 0;
    for (let p = 0; p < l; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            p++;
            linesStarts.push(p + 1);
        } else if (s[p] === "\n" || s[p] === "\r") {
            linesStarts.push(p + 1);
        }
    }
    // linesStarts.push(s.length);
    const linesCount = linesStarts.length;

    function fromPos(pos: number) {
        if (s[pos] === "\r") {
            pos++;
        }
        if (s[pos] === "\n") {
            pos++;
        }

        let a = 0;
        let b = linesCount - 1;
        while (b - a > 1) {
            let row = Math.floor((a + b) / 2);
            if (linesStarts[row] < pos) a = row;
            else if (linesStarts[row + 1] > pos) b = row;
        }

        for (let i = b; i >= a; i--) {
            if (linesStarts[i] <= pos) {
                let r = i + 1;
                let c = pos - linesStarts[i] + 1;
                if (c <= 0) c = 1;
                return { r, c };
            }
        }

        // Should be unreachable
        return { r: 0, c: 0 };
    }

    function toPos(r: number, c: number): number {
        return linesStarts[r - 1] + c - 1;
    }
    return { linesSE: linesStarts, fromPos, toPos };
}

export function strPosToRC(s: string, pos: number) {
    if (s[pos] === "\r") {
        pos++;
    }
    if (s[pos] === "\n") {
        pos++;
    }

    let r = 0;
    let lineStart = 0;
    for (let p = 0; p < pos; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            lineStart = p + 2;
            p++;
            r++;
        } else if (s[p] === "\n" || s[p] === "\r") {
            lineStart = p + 1;
            r++;
        }
    }

    r++;
    let c = pos - lineStart + 1;
    if (c <= 0) c = 1;

    return { r, c };
}

export function strRCToPos(s: string, r: number, c: number): number {
    const ln = s.length;
    let p = 0;

    r--;
    for (; r > 0 && p < ln; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            p++;
            r--;
        } else if (s[p] === "\n" || s[p] === "\r") {
            r--;
        }
    }

    // HINT: Still checking all chars till "c" in case that it was incorrect and was outside of actual string.
    c--;
    for (; c > 0 && p < ln; p++) {
        c--;
        if (s[p] === "\n" || s[p] === "\r") {
            return p;
        }
    }

    return p;
}

export function slowButSimplePosToRc(s0: string, pos: number) {
    const s = s0.substring(0, pos + 1);
    const lines = s.split(/\r\n|\r|\n/);
    const r = lines.length;
    let c = lines[r - 1].length;
    if (c == 0) c = 1;
    return { r, c };
}
