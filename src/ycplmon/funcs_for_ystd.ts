export function strMinPos(s: string, startingPos: number, ...posesOrStrings: (string | number)[]) {
    let minPos = s.length;
    for (let item of posesOrStrings) {
        if (typeof item === "number") {
            if (item < minPos) {
                minPos = item;
            }
        } else if (typeof item === "string") {
            const p = s.indexOf(item, startingPos);
            if (p < minPos) {
                minPos = p;
            }
        } else if (typeof item === "undefined") {
            continue;
        } else {
            throw new Error(`CODE00000191 Unexpected item typeof === ${typeof item}`);
        }
    }
    return minPos;
}

export function strMaxPos(s: string, startingPos: number, ...posesOrStrings: (string | number)[]) {
    let maxPos = s.length;
    for (let item of posesOrStrings) {
        if (typeof item === "number") {
            if (item > maxPos) {
                maxPos = item;
            } else if (typeof item === "string") {
                const splitted = s.slice(startingPos).split(item);
                if (splitted.length > 1) {
                    const p = s.length - splitted[splitted.length - 1].length;
                    if (p > maxPos) {
                        maxPos = p;
                    }
                }
            } else if (typeof item === "undefined") {
                continue;
            } else {
                throw new Error(`CODE00000192 Unexpected item typeof === ${typeof item}`);
            }
        }
    }
    return maxPos;
}
