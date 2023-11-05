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

export interface Line {
    s: number;
    e: number;
}

export function strPosConverter(s: string) {
    const l = s.length;
    const linesSE: Line[] = [];
    let lineStart = 0;
    for (let p = 0; p < l; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            linesSE.push({ s: lineStart, e: p });
            lineStart = p + 2;
            p++;
        } else if (s[p] === "\n" || s[p] === "\r") {
            linesSE.push({ s: lineStart, e: p });
            lineStart = p + 1;
        }
    }
    linesSE.push({ s: lineStart, e: l });

    function fromPos(pos: number) {
        let a = 0;
        let b = linesSE.length;
        while (true) {
            let row = Math.floor((a + b) / 2);
            if (linesSE[row].e < pos) a = row;
            else if (linesSE[row].s - 1 > pos) b = row;
            else {
                let r = row + 1;
                let c = pos - linesSE[row].s + 1;
                if (c === 0) c = 1;
                return { r, c };
            }
        }
    }

    function toPos(r: number, c: number): number {
        return linesSE[r - 1].s + c - 1;
    }
    return { linesSE, fromPos, toPos };
}

export function strPosToRC(s: string, pos: number) {
    const l = s.length;
    let r = 0;
    let lineStart = 0;
    for (let p = 0; p <= pos; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            lineStart = p + 2;
            r++;
        } else if (s[p] === "\n" || s[p] === "\r") {
            lineStart = p + 1;
            r++;
        }
    }
    r++;
    let c = pos - lineStart + 1;
    if (c === 0) c = 1;

    return { r, c };
}

export function strRCToPos(s: string, r: number, c: number): number {
    const l = s.length;
    let r2 = 1;
    let lineStart = 0;
    for (let p = 0; r2 < r; p++) {
        if (s[p] === "\r" && s[p + 1] === "\n") {
            lineStart = p + 2;
            r2++;
        } else if (s[p] === "\n" || s[p] === "\r") {
            lineStart = p + 1;
            r2++;
        }
    }

    return lineStart + c - 1;
}

export function slowButSimplePosToRc(s0: string, pos: number) {
    const s = s0.substring(0, pos + 1);
    const lines = s.split(/\r\n|\r|\n/);
    const r = lines.length;
    let c = lines[r - 1].length;
    if (c == 0) c = 1;
    return { r, c };
}
