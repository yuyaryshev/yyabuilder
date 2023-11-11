// Tasks
//      Split file into parts
//      Many splitters
//          - cpl
//          - lines
//          - inprint clauses
//      Replace/change any parts
//      Regenerate the file from changed parts

import { StrRef } from "./strRef";

export class GenericTextTransformerBuilder {
    constructor() {}
}

export class StrRefsCollection {
    private stringRefs: StrRef[];
    constructor(sourceString: string) {
        this.stringRefs = [{ s: sourceString }];
    }

    split(regExp: RegExp) {
        // TODO split existing refs by provided regexp
    }
}
