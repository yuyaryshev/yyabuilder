import stripColor from "strip-color";
export interface YEslintMessage {
    ruleId: string;
    line: number;
    pos: number;
    severity: "error" | "warn" | "info";
    message: string;
}

export interface YEslintFileRecord {
    filePath: string;
    messages: YEslintMessage[];
}
export function isYEslintFileRecord(v: any): v is YEslintFileRecord {
    return v && !!v.messages && !!v.filePath;
}

export interface YEslintFinalMessage {
    t: "YEslintFinalMessage";
}

export type EslintResult = YEslintFileRecord[];

interface ParseContext {
    lines: string[];
    line: number;
}

function readYEslintMessage(s0: string): YEslintMessage | undefined {
    if (!s0 || !s0.startsWith("  ")) {
        return undefined;
    }

    let s = s0.trim();
    let lastLen = -1;
    while (lastLen !== s.length) {
        lastLen = s.length;
        s = s.split("  ").join(" ");
    }
    const arr = s.split(" ");
    const ruleId = arr.pop();
    const [posStr, severity, ...messageArr] = arr;
    if (!posStr.includes(":")) {
        return undefined;
    }

    const message = messageArr.join(" ");
    const [line, pos] = posStr.split(":").map((s) => +s);
    const r: YEslintMessage = { ruleId, line, pos, severity, message } as any;

    return r;
}

function readYEslintFileRecord(c: ParseContext): YEslintFileRecord | undefined {
    const currentLine = c.lines[c.line];
    if (!currentLine.startsWith("  ")) {
        const filePath = currentLine;
        const messages: YEslintMessage[] = [];
        c.line++;
        while (true) {
            const message = readYEslintMessage(c.lines[c.line]);
            if (!message) {
                break;
            }
            messages.push(message);
            c.line++;
        }
        return { filePath, messages };
    }
    return undefined;
}

function readYEslintFinalMessage(c: ParseContext): YEslintFinalMessage | undefined {
    const currentLine = c.lines[c.line];
    if (currentLine.endsWith("warnings)")) {
        c.line++;
        return {
            t: "YEslintFinalMessage",
        };
    }
    return undefined;
}
function readEmptyLine(c: ParseContext): true | undefined {
    const currentLine = c.lines[c.line];
    if (!currentLine.trim().length) {
        c.line++;
        return true;
    }
    return undefined;
}

export function parseEslintOutput(s: string): EslintResult {
    if (!s && !s.trim().length) {
        return [];
    }
    const c: ParseContext = { lines: stripColor(s).trim().split("\n"), line: 0 };
    const fileRecords: YEslintFileRecord[] = [];
    while (c.line < c.lines.length) {
        const item = readYEslintFinalMessage(c) || readYEslintFileRecord(c) || readEmptyLine(c);
        if (item === undefined) {
            throw new Error(`CODE00000004 Failed to parse line ${c.line} = ${c.lines[c.line]}`);
        }
        if (isYEslintFileRecord(item)) {
            fileRecords.push(item);
        }
    }
    return fileRecords;
}
