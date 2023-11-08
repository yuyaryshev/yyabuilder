import { readDirRecursive } from "./ycplmon/index.js";
import type { Dirent } from "fs";
function indentStr(n: number) {
    return "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".substr(0, n);
}

const removeExpectedSuffix = (s: string, suffix: string): string => {
    if (!s.endsWith(suffix)) {
        throw new Error(`CODE00000190 removeExpectedSuffix failed! Expected suffix '${suffix}' in string '${s}'!`);
    }
    return s.substr(0, s.length - suffix.length);
};


export function projectFolderTree(projectFolderPath: string) {
    let r = "";
    const initialCount = projectFolderPath.split("\\").length;
    readDirRecursive(projectFolderPath, (parentPath: string, dirent: Dirent) => {
        if (!dirent.name.endsWith(".ts")) {
            return true;
        }
        r += `${parentPath.substr(projectFolderPath.length)}\\${dirent.name}`+ "\n";
        // console.log({parentPath, dirent});
        return true;
    });
    return r;
}

console.log(projectFolderTree(`d:\\b\\Mine\\GIT_Work\\ydomain_compiler\\src`));
