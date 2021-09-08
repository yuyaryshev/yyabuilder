const globby = import("globby");
import { readFileSync, writeFileSync } from "fs-extra";

export function replaceStrings(s: string, replacers: string[]) {
    if (typeof replacers !== "object")
        throw new Error(
            `CODE00000019 replaceStrings 'replacers' parameter should be an object whose keys are neddles and values are replacement for them.`,
        );
    for (let k in replacers) s.split(k).join(replacers[k]);
    return s;
}

export async function massReplace(globby_patterns: any | any[], replacers: string[]) {
    if (typeof replacers !== "object")
        throw new Error(
            `CODE00000020 massReplace 'replacers' parameter should be an object whose keys are neddles and values are replacement for them.`,
        );

    const files = (await globby).globbySync(Array.isArray(globby_patterns) ? globby_patterns : [globby_patterns]);
    for (const filePath of files) {
        const content0 = readFileSync(filePath, "utf-8");
        const newContent = replaceStrings(content0, replacers);
    }
}
