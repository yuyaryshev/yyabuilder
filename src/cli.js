const { join: joinPath } = require("path");
const { Command } = require("commander");
const version = require("../version.cjs");
const { shelljs } = require("./yshelljs.js");
const { runBabelEsm, runBabelCjs, runBabelAll } = require("./runBabel.js");
const { runTypescriptEsm, runTypescriptCjs, runTypescriptAll } = require("./runTypescript.js");
const { cleanEsm, cleanCjs, cleanTypes, cleanTs, cleanAll } = require("./clean.js");
const { genprojmeta } = require("./genprojmeta.js");
const {massReplace} = require( "./massReplace.js");

/**
 * Starts up console application
 */
function startCli() {
    const program = new Command();
    program.version(version);
    // .option("--full", "NOT USED - Rebuild the database")
    // .option("-w, --watch", "NOT USED - Watch for changes. Warning: loses changes if used with WebStorm!")
    // .option("--db <dbpath>", "NOT USED - Custom path for the database")
    // .option("--nodb", `NOT USED - Don't use database`)
    // .option("--interval", "NOT USED - Interval in seconds before watch notification, default 10 seconds")

    program
        .command("genprojmeta")
        .description("Generates src/version.ts file")
        .action(function cmd_genprojmeta(targetPath, options, command) {
            //const { db, rebuild, nowatch, interval, nodb } = program.opts();
            genprojmeta("src");
            genprojmeta("esm");
            genprojmeta("cjs");
        });


    program
        .command("replace <replacers> <glob>")
        .description("Generates src/version.ts file")
        .action(function cmd_replace(targetPath, options, command) {
            massReplace

        });


    program
        .command("clean_esm")
        .description("Cleans esm output directory")
        .action(function clean_esm(targetPath, options, command) {
            //const { db, rebuild, nowatch, interval, nodb } = program.opts();
            cleanEsm();
        });

    program
        .command("clean_cjs")
        .description("Cleans cjs output directory")
        .action(function clean_cjs(targetPath, options, command) {
            cleanCjs();
        });

    program
        .command("clean_types")
        .description("Cleans types output directory")
        .action(function clean_types(targetPath, options, command) {
            cleanTypes();
        });

    program
        .command("clean_ts")
        .description("Cleans ts output directory")
        .action(function clean_ts(targetPath, options, command) {
            cleanTs();
        });

    program
        .command("clean_all")
        .description("Cleans types output directory")
        .action(function clean_all(targetPath, options, command) {
            cleanAll();
        });

    program
        .command("build_esm")
        .description("Builds current project with babel esm configuration")
        .action(function build_esm(targetPath, options, command) {
            //const { db, rebuild, nowatch, interval, nodb } = program.opts();
            runBabelEsm();
        });

    program
        .command("build_cjs")
        .description("Builds current project with babel cjs configuration")
        .action(function build_cjs(targetPath, options, command) {
            runBabelCjs();
        });

    // YYA: Typescript wont work! Because it takes path from tsconfig.json location, so I can't start it with config file located in this project!
    // program
    //     .command("build_types_esm")
    //     .description("Builds current project with babel esm configuration")
    //     .action(function build_esm(targetPath, options, command) {
    //         //const { db, rebuild, nowatch, interval, nodb } = program.opts();
    //         runTypescriptEsm();
    //     });
    //
    // program
    //     .command("build_types_cjs")
    //     .description("Builds current project with babel cjs configuration")
    //     .action(function build_cjs(targetPath, options, command) {
    //         runTypescriptCjs();
    //     });

    program
        .command("build_all")
        .description("Builds current project with babel cjs configuration")
        .action(function build_cjs(targetPath, options, command) {
            cleanAll();
            runBabelAll();
            // runTypescriptAll();
        });

    program.parse(process.argv);
}

module.exports = { startCli };
