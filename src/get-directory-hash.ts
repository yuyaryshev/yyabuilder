import { join, resolve, isAbsolute } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {cyan, bold, gray} from 'chalk';
import { defaultExclude } from "./default-exclude";

type Exclude = string[];

export type HashingOptions = {
    exclude: Exclude;
}

export type TraverseOptions = {
    forAll: (files: string[]) => string[];
    forEach: (file: string) => void;
}
/**
 *
 * @param a -
 * @param b -
 */
const sortStrings = (a: string, b: string): number => {
    if (a > b) {
        return -1;
    }

    if (b > a) {
        return 1;
    }

    return 0;
}

/**
 *
 * @param src -
 * @param options -
 */
const traverseDirectory = async (src: string, options: TraverseOptions) => {
    const { forAll, forEach } = options;
    try {
        let files = forAll(await readdir(src));

        for (const file of files) {
            const absolutePath = join(src, file);
            const fileStat = await stat(absolutePath);

            fileStat.isDirectory()
                ? await traverseDirectory(absolutePath, options)
                : forEach(absolutePath);
        }
    } catch (error) {
        console.error('WEE-oww 🚒 \n', error);
    }
}

/**
 *
 * @param sead -
 */
const getHashFromSead = (sead: string) => createHash('sha256').update(sead).digest('base64');

/**
 *
 * @param fileName -
 */
const makeHashedFileName = (fileName: string) => `${fileName.toLowerCase()}:${getHashFromSead(fileName)}`;

const defaultOptions: HashingOptions = {
    exclude: defaultExclude,
}

/**
 *
 * @param path -
 * @param exclude -
 */
export const getDirectoryHash = async (path = '.' , { exclude } = defaultOptions ) => {
    if (!isAbsolute(path)) {
        path = resolve(path);
    }

    console.info(`🚢 ${gray('Traverse directory: ')} ${bold(cyan(path))}`);

    const hashedFiles: string[] = [];

    await traverseDirectory(path, {
        forEach(file) {
            hashedFiles.push(makeHashedFileName(file));
        },
        forAll(files) {
            return files
                .filter((file) => !exclude.includes(file))
                .sort(sortStrings)
        }
    })

    return getHashFromSead(hashedFiles.join(''));
}
