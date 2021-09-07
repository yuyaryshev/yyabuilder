import { readdirSync, Dirent } from "fs";
import { join as joinPath } from "path";

export type ReadDirCallback = (path: string, filename: Dirent) => true | false | undefined | void;

export const readDirRecursive = (path: string, v_callback: ReadDirCallback) => {
    const files = readdirSync(path, { withFileTypes: true });
    for (const filename of files) {
        const r = v_callback(path, filename);
        if (r !== false && filename.isDirectory()) readDirRecursive(joinPath(path, filename.name), v_callback);
    }
};

export type ReadDirCallback2 = (path: string, filename: Dirent, parentResult?: any | undefined) => any | undefined | void;

export const readDirRecursive2 = (path: string, v_callback: ReadDirCallback2, parentResult?: any | undefined) => {
    const files = readdirSync(path, { withFileTypes: true });
    for (const filename of files) {
        const r = v_callback(path, filename, parentResult);
        if (r !== false && filename.isDirectory()) readDirRecursive2(joinPath(path, filename.name), v_callback, r);
    }
};
