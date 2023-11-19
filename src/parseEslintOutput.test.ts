import { expectDeepEqual } from "./expectDeepEqual.js";
import { EslintResult, parseEslintOutput } from "./parseEslintOutput.js";

describe("parseEslintOutput.test.ts", () => {
    it("sample1", () => {
        const exampleOutput: string = `
D:\\b\\Mine\\GIT_Work\\yyabuilder\\src\\inprint\\inprint.ts
  5:55  error  Missing file extension for "./InprintOptions"  import/extensions

✖ 1 problem (1 error, 0 warnings)
`;
        const rrr = parseEslintOutput(exampleOutput);
        expectDeepEqual(rrr, [
            {
                filePath: "D:\\b\\Mine\\GIT_Work\\yyabuilder\\src\\inprint\\inprint.ts",
                messages: [
                    {
                        line: 5,
                        pos: 55,
                        severity: "error",
                        message: 'Missing file extension for "./InprintOptions"',
                        ruleId: "import/extensions",
                    },
                ],
            },
        ] as EslintResult);
    });
});
