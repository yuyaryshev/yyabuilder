import { readFileSync, outputFileSync } from "fs-extra";
export const writeFileSyncIfChanged = (fileName: string, content: string) => {
    let current;
    try {
        current = readFileSync(fileName, "utf-8");
    } catch (e:any) {}
    if (current !== content) {
        outputFileSync(fileName, content, "utf-8");
        return true;
    }
    return false;
};
