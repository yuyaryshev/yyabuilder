const globby = require("globby");
const { readFileSync, writeFileSync } = require("fs-extra");

function replaceStrings(s, replacers) {
    if (typeof replacers !== "object")
        throw new Error(
            `CODE00000000 replaceStrings 'replacers' parameter should be an object whose keys are neddles and values are replacement for them.`,
        );
    for (let k in replacers) s.split(k).join(replacers[k]);
    return s;
}

function massReplace(globby_patterns, replacers) {
    if (typeof replacers !== "object")
        throw new Error(
            `CODE00000000 massReplace 'replacers' parameter should be an object whose keys are neddles and values are replacement for them.`,
        );

    const files = globby.sync(Array.isArray(globby_patterns) ? globby_patterns : [globby_patterns]);
    for (const filePath of files) {
        const content0 = readFileSync(filePath, "utf-8");
        const newContent = replaceStrings(content0, replacers);
    }
}

module.exports = { replaceStrings, massReplace };
