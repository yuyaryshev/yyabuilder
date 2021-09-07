import { InprintOptions } from "./InprintOptions.js";

export type InprintHandler = (params: any, options: InprintOptions) => string | undefined;
