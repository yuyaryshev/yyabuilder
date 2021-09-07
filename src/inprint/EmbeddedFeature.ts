import { InprintHandler } from "./InprintHandler.js";

export interface EmbeddedFeature {
    name: string;
    description: string;
    func: InprintHandler;
    keywords: string[];
    help: string;
}
