import { readdirSync } from "fs";
import { resolve } from "path";
import { EmbeddedFeature } from "../EmbeddedFeature.js";
import { InprintOptions } from "../InprintOptions.js";

export const indexTsEmbeddedFeature: EmbeddedFeature = {
    name: "IndexTs",
    keywords: ["index"],
    description: `Generates reexport for each file inside directory. 
Use exclude:['name1','name2'] to exclude some files. 
Use merge:[{name:'MERGE_NAME', suffix:'MERGE_SUFFIX', asObject:false}] to merge exported consts with specified MERGE_SUFFIX as an array into one variable MERGE_NAME`,
    func: inprintIndexTs,
    help: `// ${"@"}INPRINT_START {exclude:[""], merge:[{name:"embeddedFeatures:EmbeddedFeature[]", suffix:"EmbeddedFeature", definitionStr:"export async function initTables(dbEnv: ServiceDbEnv) {\\n  return {\\n    ITEMS\\n  }\\n}", itemStr:"FILE:await VAR(dbEnv),"}]}
export * from "./indexTs.js";

import { indexTsEmbeddedFeature } from "./indexTs.js";
export const embeddedFeatures: EmbeddedFeature[] = [indexTsEmbeddedFeature];
// ${"@"}INPRINT_END
    `,
};

const allowedExtensions = new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx"]);

export interface IndexTsMergeDefinition {
    name: string;
    suffix: string;
    asObject?: boolean;
    definitionStr?: string;
    itemStr?: string;
}

export function inprintIndexTs(paramsObject: any, options: InprintOptions) {
    if (!paramsObject.absolutePath.endsWith("/index.ts")) return undefined;

    const excludes: Set<string> = new Set([
        "projmeta",
        ...(paramsObject?.excludes || []),
        ...(paramsObject?.exclude || []),
        ...(paramsObject?.excluding || []),
    ]);

    const merges: IndexTsMergeDefinition[] = [...new Set([...(paramsObject?.merge || [])])];

    excludes.add("index");
    const baseParts = resolve(paramsObject.absolutePath.split("/").slice(0, -1).join("/"));

    const fileNames = [];
    for (const dirent of readdirSync(baseParts, { withFileTypes: true })) {
        if (dirent.isDirectory()) continue;
        const fileName = dirent.name;
        const temp = fileName.split(".");
        const ext = temp[temp.length - 1];
        if (!allowedExtensions.has(ext)) continue;
        const nameWoExt = fileName.split(".").slice(0, -1).join(".");
        if (!paramsObject.includeTests && nameWoExt.endsWith(".test")) continue;
        if (excludes.has(fileName) || excludes.has(nameWoExt)) continue;
        fileNames.push(nameWoExt);
    }
    fileNames.sort();

    const reexports = fileNames.map((f) => `export * from "./${f}${options.appendJsInImports ? ".js" : ""}";`).join("\n");

    const mergeArrayBlocks = [];
    for (const mergeDefinition of merges) {
        const mergeLines = [];
        const mergeVarDefs: { VAR: string; FILE: string }[] = [];
        const mergeVars = [];
        for (const nameWoExt of fileNames) {
            const varName = `${nameWoExt}${mergeDefinition.suffix}`;
            mergeVarDefs.push({ VAR: varName, FILE: nameWoExt });
            mergeLines.push(`import {${varName}} from "./${nameWoExt}.js";`);
            mergeVars.push(`${mergeDefinition.asObject ? `${nameWoExt}:` : ""}${nameWoExt}${mergeDefinition.suffix}`);
        }
        if (mergeDefinition.definitionStr) {
            const itemsStrs: string[] = [];
            for (const varDef of mergeVarDefs) {
                itemsStrs.push(mergeDefinition.itemStr!.split("VAR").join(varDef.VAR).split("FILE").join(varDef.FILE));
            }
            mergeArrayBlocks.push(
                `
${mergeLines.join("\n")}
${mergeDefinition.definitionStr.split("ITEMS").join(itemsStrs.join())}
`.trim(),
            );
        } else {
            mergeArrayBlocks.push(
                `
${mergeLines.join("\n")}
export const ${mergeDefinition.name} = ${mergeDefinition.asObject ? "{" : "["}${mergeVars.join(", ")}${mergeDefinition.asObject ? "}" : "]"};
`.trim(),
            );
        }
    }
    const r = `
${reexports}

${mergeArrayBlocks.join("\n\n")}
`.trim();

    if (!r.length) return `export const unused901723 = 0; // No files found!`;

    return r;
}
