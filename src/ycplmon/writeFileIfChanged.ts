import { readFileSync, outputFileSync } from "fs-extra";

export const writeFileIfChangedSync = (fileName: string, content: string, oldContent?: string) => {
    let current: string | undefined;
    try {
        current = oldContent !== undefined ? oldContent : readFileSync(fileName, "utf-8");
    } catch (e) {}

    if (current !== content) {
        outputFileSync(fileName, content, "utf-8");
        return true;
    }
    return false;
};
