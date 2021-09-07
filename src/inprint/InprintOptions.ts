import { InprintHandler } from "./InprintHandler.js";

export interface InprintOptions {
    skipNodeModules: boolean;
    files: string | string[];
    logging: "short" | "files" | false;
    inprint?: InprintHandler | undefined;
    embeddedFeatures: "first" | true | "last" | false;
    prettierOpts?: any;
    forceProcessTermination?: boolean;
    appendJsInImports: boolean;
}

export const defaultInprintOptions = {
    skipNodeModules: true,
    files: ["src/**/*.{ts,cts,mts,tsx,js,jsx,cjs,mjs}"],
    logging: "short" as const,
    embeddedFeatures: true,
    appendJsInImports: true,
};
