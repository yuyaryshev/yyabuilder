import { expect } from "chai";
import { tryStringify } from "./tryStringify.js";

//v2

export function expectDeepEqual<T = unknown>(actual: T, expected: T, cpl: string = "CODE00000001") {
    try {
        if (actual !== expected) {
            expect(actual).to.deep.equal(expected);
        }
    } catch (e: any) {
        console.log(`${cpl} Actual res=\n${tryStringify(actual, 4, 5000)}`);
        e.message = cpl + " " + e.message;
        e.stack = cpl + " " + e.stack;
        throw e;
    }
}
