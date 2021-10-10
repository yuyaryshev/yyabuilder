import JSON5 from "json5";
import { readFileSync, writeFileSync } from "fs";
import { resolve, basename, join } from "path";
import { embeddedFeatures } from "./embeddedFeatures/index.js";
import { defaultInprintOptions, InprintOptions } from "./InprintOptions.js";
import { formatTypescript } from "./formatTypescript.js";
import { EmbeddedFeature } from "./EmbeddedFeature.js";
const globby = import("globby");

export const inprint_prefix = "@" + "INPRINT";
export const startPrefix = "_START";
export const endPrefix = "_END";
export const usageNotice = `
USAGE:

// ${inprint_prefix}_START [directive] {...any_json_params...}
// Generated code will go here
// ${inprint_prefix}_END
`;

interface InprintFilePart {
    header: string;
    params: any;
    middle: string;
    tail: string;
    newMiddle: string;
}

export const writeFileSyncIfChanged = (fileName: string, content: string) => {
    let current: string | undefined;
    try {
        current = readFileSync(fileName, "utf-8");
    } catch (e: any) {}

    if (current !== content) {
        writeFileSync(fileName, content, "utf-8");
        return true;
    }
    return false;
};

export function handleFile(filePath: string, options: InprintOptions): boolean {
    const contentStr = readFileSync(filePath, "utf-8");

    if (!contentStr.includes(inprint_prefix)) return false;

    const [fileHeader, ...parts0] = contentStr.split(inprint_prefix);
    const parts: InprintFilePart[] = [];
    for (let i = 0; i < parts0.length; i += 2) {
        const s = parts0[i];
        if (!s.startsWith(startPrefix)) {
            console.error(`CODE00000001 INPRINT_ERROR No ${inprint_prefix}${startPrefix} in ${filePath}`);
            return false;
        }

        if (!parts0[i + 1].startsWith(endPrefix)) {
            console.error(`CODE00000002 INPRINT_ERROR No ${inprint_prefix}${endPrefix} in ${filePath}`);
        }

        try {
            const [header, ...middleParts] = s.split("\n");
            const lastPart = middleParts.pop();

            const paramsStr = header.substr(startPrefix.length).trim();
            const middle = middleParts.join("\n");
            const tail = lastPart + inprint_prefix + parts0[i + 1];

            const params = {
                content: middle,
                absolutePath: filePath,
                ...JSON5.parse(paramsStr),
            };
            parts.push({ header, params, middle, tail, newMiddle: "" });
        } catch (e: any) {
            console.error(`CODE00000003 INPRINT_ERROR ${e.message} in ${filePath}`);
            return false;
        }
    }

    for (const part of parts) {
        try {
            part.newMiddle = doInprint(part.params, options, part.middle);
        } catch (e: any) {
            part.newMiddle = `// INPRINT_FAILED because of exception:\n${e.message || "NO_ERROR_MESSAGE"}\\n${e.stack || "NO_STACK_TRACE"}`
                .split("\n")
                .join("\n//     ");
        }
    }

    const newContent = formatTypescript(
        fileHeader + inprint_prefix + parts.map((p) => `${p.header}\n${p.newMiddle}\n${p.tail}`).join(inprint_prefix),
        options.prettierOpts,
    );
    writeFileSyncIfChanged(filePath, newContent);
    return true;
}

export function callEmbeddedFeatures(params: any, options: InprintOptions, oldBody: string): string | undefined {
    for (const embeddedFeature of embeddedFeatures) {
        const r = embeddedFeature.func(params, options, oldBody);
        if (r) return r;
    }
    return undefined;
}

export function doInprint(params: any, options: InprintOptions, oldBody: string): string {
    if (options.embeddedFeatures === "first" || options.embeddedFeatures === true) {
        const r = callEmbeddedFeatures(params, options, oldBody);
        if (r) return r;
    }

    if (options.inprint) {
        const r = options.inprint(params, options, oldBody);
        if (r) return r;
    }

    if (options.embeddedFeatures === "last") {
        const r = callEmbeddedFeatures(params, options, oldBody);
        if (r) return r;
    }
    return `// INPRINT_ERROR None of inprint functions returned a result. They all returned undefined!`;
}

export function expectFeature(query0: string): EmbeddedFeature {
    const query = query0.toLowerCase();
    for (const feature of embeddedFeatures) if (feature.name.toLowerCase() === query) return feature;
    for (const feature of embeddedFeatures) for (const keyword of feature.keywords) if (keyword.toLowerCase() === query) return feature;
    for (const feature of embeddedFeatures) if (feature.name.toLowerCase().includes(query)) return feature;
    for (const feature of embeddedFeatures) for (const keyword of feature.keywords) if (keyword.toLowerCase().includes(query)) return feature;
    throw new Error(`CODE00000010 No feature has ${query0} in name or keywords`);
}

// const testFilePath = `D:\\b\\Mine\\GIT_Work\\yatasks_one_api\\src\\inprintTestFile.ts`;
// handleFile(testFilePath);

export function inprintRunFromCmd(options0?: InprintOptions | undefined) {
    if (process.argv[2] === "--version" || process.argv[2] === "-v") {
        // @ts-ignore
        console.log(version);
        return;
    } else if (process.argv[2] === "--help" || process.argv[2] === "-h" || process.argv[2] === "-help") {
        const featureQuery = process.argv[3]?.trim() || "";
        if (featureQuery.length) {
            const feature = expectFeature(featureQuery);
            console.log(`${feature.name} usage help:\n`, feature.help);
        } else
            console.log(`
Usage:
inprint                     - Replaces all ${"@"}INPRINT_START - ${"@"}INPRINT_END blocks using functions specified in inprint.cjs
inprint [--help [feature]]  - prints help for specifiec 'feature'. 'feature' can be part of feature name or part of feature keyword
`);

        return;
    }

    let optionsPath: string | undefined = undefined;
    if (process.argv[2])
        try {
            if (!options0) {
                optionsPath = process.argv[2];
                options0 = require(optionsPath);
            }
        } catch (e: any) {
            if (e.code !== "ENOENT" && !e.message.includes("Cannot find module")) {
                console.error(`CODE00000023 INPRINT failed to load '${optionsPath}' because of exception:`);
                console.error(e);
                process.exit(1);
                return;
            }
        }

    try {
        if (!options0) {
            optionsPath = resolve(process.cwd(), "inprint.cjs");
            options0 = require(optionsPath);
        }
    } catch (e: any) {
        if (e.code !== "ENOENT" && !e.message.includes("Cannot find module")) {
            console.error(`CODE00000006 INPRINT failed to load '${optionsPath}' because of exception:`);
            console.error(e);
            process.exit(1);
            return;
        }
    }

    try {
        if (!options0) {
            optionsPath = resolve(process.cwd(), "inprint.js");
            options0 = require(optionsPath);
        }
    } catch (e: any) {
        if (e.code !== "ENOENT" && !e.message.includes("Cannot find module")) {
            console.error(`CODE00000008 INPRINT failed to load '${optionsPath}' because of exception:`);
            console.error(e);
            process.exit(1);
            return;
        }
    }

    if (!options0) optionsPath = "<default options>";
    if (options0?.logging) console.log(`CODE00000005 INPRINT options from ${optionsPath}`);

    let projectName;
    if (!options0?.packageName && optionsPath)
        try {
            const bPath = basename(optionsPath);
            const packageJsonPath = join(bPath, "package.json");
            (options0 as any).packageName = JSON5.parse(readFileSync(packageJsonPath, "utf-8")).name;
        } catch (e: any) {
            if (e.code !== "ENOENT" && !e.message.includes("Cannot find module")) {
                console.error(`CODE00000009 INPRINT failed to load '${optionsPath}' because of exception:`);
                console.error(e);
                process.exit(1);
                return;
            }
        }

    (options0 as any).optionsPath = optionsPath;
    inprint(options0).then();
}

export async function inprint(options0?: InprintOptions | undefined) {
    const options: InprintOptions = { ...defaultInprintOptions, ...options0 };
    let processedCount = 0;
    const paths = (await globby).globbySync(options.files);

    for (const filePath of paths) {
        if (options.logging === "files") console.log(`CODE00000024 INPRINT ${filePath}`);
        if (filePath.includes("node_modules") && options.skipNodeModules) continue;
        if (handleFile(filePath, options)) processedCount++;
    }

    if (options.logging)
        console.log(
            `CODE00000007 INPRINT finished, ${paths.length} - total files, ${processedCount} - processed, ${paths.length - processedCount} - skipped`,
        );
    if (options.forceProcessTermination) process.exit(0);
}
