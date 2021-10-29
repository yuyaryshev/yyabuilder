import { join, resolve } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { readJson, existsSync } from "fs-extra";
import { red, yellow, green } from "chalk";
import { getDirectoryHash } from "./get-directory-hash.js";

const isPackage = (path: string): boolean => existsSync(join(path, "package.json"));

export const makeSnapshot = async (path: string) => {
    const root = resolve(path);
    const files = await readdir(root);
    const snapshot: Record<string, string> = {};
    let ok = true;

    for (const file of files) {
        const filePath = join(root, file);
        const fileStat = await stat(filePath);

        if (fileStat.isDirectory() && isPackage(filePath)) {
            try {
                const packageJsonPath = join(filePath, "package.json");
                const packageJson = await readJson(packageJsonPath)
                    .catch(() => {
                       console.warn(yellow(`⚠️ Is not an npm packaga: ${filePath}`)) ;
                    });

                if (!packageJson) {
                    continue;
                }

                const publishedFilePath = join(filePath, "published.json");
                const published = await readJson(publishedFilePath)
                    .catch(() => {
                        console.error(red(`🚒 Package is not published: ${filePath}`));
                        console.info(yellow('🎉 Try this:'), green(`cd ${filePath} && npm run republish`));
                        console.log();
                        ok = false;
                    });

                if (!published) {
                    continue;
                }

                const currentHash = await getDirectoryHash(filePath);

                if (currentHash !== published.hash) {
                    console.error(red("🚒 Published and current caches do not match for: "), filePath);
                    console.info(yellow('🎉 Try this:'), green(`cd ${filePath} && npm run republish`));
                    console.log();
                    ok = false;
                } else if (packageJson.version !== published.version) {
                    console.error(red("🚒 Published and current versions do not match for: "), filePath);
                    console.info(yellow('🎉 Try this:'), green(`cd ${filePath} && npm run republish`));
                    console.log();
                    ok = false;
                } else {
                    snapshot[packageJson.name] = published.version;
                    console.log(green('👌 OK'));
                    console.log();
                }
            } catch (error: any) {
                console.error("🚒", red(error.message));
                console.log();
                ok = false;
            }
        }
    }

    return { snapshot, ok };
}