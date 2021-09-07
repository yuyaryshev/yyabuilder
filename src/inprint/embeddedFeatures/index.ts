import { EmbeddedFeature } from "../EmbeddedFeature.js";

// export * from "./indexTs";
// import {indexTsEmbeddedFeature} from "./indexTs";
// export const embeddedFeatures:EmbeddedFeature[] = [indexTsEmbeddedFeature];

// @INPRINT_START {exclude:[""], merge:[{name:"embeddedFeatures:EmbeddedFeature[]", suffix:"EmbeddedFeature"}]}
export * from "./indexTs.js";

import { indexTsEmbeddedFeature } from "./indexTs.js";
export const embeddedFeatures: EmbeddedFeature[] = [indexTsEmbeddedFeature];
// @INPRINT_END
