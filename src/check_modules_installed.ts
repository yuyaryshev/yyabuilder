import { join, resolve, isAbsolute, dirname } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { cyan, bold, gray } from "chalk";
import { readFileSync, writeFileSync } from "fs";

export function getPackageJsonModulesHash(packageJsonContent: any, additionalDataForHashing?: any) {
    const o: any = {};
    if (additionalDataForHashing) {
        o.additionalDataForHashing = additionalDataForHashing;
    }

    for (const k in packageJsonContent) {
        if (k.toLowerCase().includes("depend") || k === "resolutions") {
            o[k] = packageJsonContent[k];
        }
    }
    const modulesInfoStrInPackagesJson = JSON.stringify(o);
    return createHash("sha256").update(modulesInfoStrInPackagesJson).digest("base64");
}

export function getPackageJsonFileModulesHash(packagesJsonPath: string, additionalDataForHashing?: any) {
    const local_packages_list_path = join(dirname(packagesJsonPath)||".", "..","local_packages_list.js");
    let additionalDataForHashing2: any = additionalDataForHashing || {};
    try {
        const local_packages_list_m = require(local_packages_list_path);
        additionalDataForHashing2.local_packages_list = local_packages_list_m?.localPackagesList;
    } catch (e) {
    }

    const packageJsonContent: any = JSON.parse(readFileSync(packagesJsonPath, "utf-8"));
    const modulesHash = getPackageJsonModulesHash(packageJsonContent, additionalDataForHashing2);
    return modulesHash;
}

export function getNodeModulesInstalledHash(): string | undefined {
    try {
        return readFileSync("./node_modules/installed_hash", "utf-8").trim();
    } catch (e: any) {}
    return undefined;
}

export function saveModulesInstalledHash(additionalDataForHashing?: any) {
    const packagesJsonHash = getPackageJsonFileModulesHash("./packages.json", additionalDataForHashing).trim();
    writeFileSync("./node_modules/installed_hash", packagesJsonHash, "utf-8");
}

export function checkModulesInstalled() {
    const packagesJsonHash = getPackageJsonFileModulesHash("./packages.json");
    const nodeModulesInstalledHash = getNodeModulesInstalledHash();
    return packagesJsonHash !== nodeModulesInstalledHash;
}
