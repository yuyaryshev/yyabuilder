import { InprintOptions } from "./InprintOptions.js";

export type InprintHandler = (params: any, options: InprintOptions, oldBody: string) => string | undefined;
