let formatjs: any = undefined;

// @ts-ignore
try {
    formatjs = require("prettier");
} catch (e:any) {}

export const formatTypescript = (typescriptSourceCode: string, prettierOpts: any): string => {
    if (!formatjs.format) return typescriptSourceCode;
    try {
        // console.log(`formatTypescript started`);
        return formatjs.format(typescriptSourceCode, prettierOpts);
    } catch (e:any) {
        // console.warn(`formatTypescript failed`, e);
        return typescriptSourceCode;
    }
};

// export const formatTypescript = (s: string): string => s;
