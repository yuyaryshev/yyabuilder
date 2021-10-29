import { join, join as joinPath, resolve } from "path";
import { writeJson, ensureFile, readJson } from "fs-extra";
import { readdir, stat } from "node:fs/promises";
import { Command } from "commander";
import { shelljs } from "./yshelljs.js";
import { runBabelEsm, runBabelCjs, runBabelAll } from "./runBabel.js";
import { runTypescriptEsm, runTypescriptCjs, runTypescriptAll } from "./runTypescript.js";
import { cleanEsm, cleanCjs, cleanTypes, cleanTs, cleanDocs, cleanFrontend, cleanAll } from "./clean.js";
import { genprojmeta } from "./genprojmeta.js";
import { massReplace } from "./massReplace.js";
import { add_js_to_imports } from "./add_js_to_imports.js";
import { version } from "./projmeta.js";
import { fix_cpls } from "./ycplmon/index.js";
import { inprint, inprintRunFromCmd } from "./inprint/index.js";
import { getDirectoryHash } from "./get-directory-hash.js";
import { bold, gray, green, red, yellow } from "chalk";
import { makeSnapshot } from "./make-snapshot.js";

/**
 * Starts up console application
 */
export function startCli() {
    const program = new Command();
    program.version(version);
    // .option("--full", "NOT USED - Rebuild the database")
    // .option("-w, --watch", "NOT USED - Watch for changes. Warning: loses changes if used with WebStorm!")
    // .option("--db <dbpath>", "NOT USED - Custom path for the database")
    // .option("--nodb", `NOT USED - Don't use database`)
    // .option("--interval", "NOT USED - Interval in seconds before watch notification, default 10 seconds")

    program
        .command("dir_hash [path]")
        .description("Generate hash from directory contents")
        .action(async (path) => {
            const hash = await getDirectoryHash(path);

            try {
                const packageJson = await readJson(resolve("package.json"));
                const publishedContent = {
                    version: packageJson.version,
                    hash,
                };
                const publishedFile = resolve("published.json");

                await ensureFile(publishedFile);
                await writeJson(publishedFile, publishedContent, { spaces: 2 });

                console.log(`Current publishe version: ${yellow(bold(packageJson.version))}`);
                console.log(`Current publishe hash: ${gray(hash)}`);
            } catch (error: any) {
                console.error("🚒", red(error.message));
            }
        });

    program
        .command('check-snapshot')
        .description('')
        .action(async () => {
            try {
                const current = await readJson(resolve( 'published.json'));
                const hash = await getDirectoryHash(resolve('.'));

                if (current.hash === hash) {
                    console.info(green('Already ap-to-date'));
                    process.exit(1)
                }
            } catch (error:any) {
                console.error(error.message);
            }
        })

    program
        .command("commit-tag-push")
        .description("")
        .action(async () => {
            try {
                const { version } = await readJson(resolve("package.json"));
                shelljs.exec('git commit -m "republish"');
                shelljs.exec(`git tag ${version}`);
                shelljs.exec("git push");
            } catch (error:any) {
                console.error("🚒", red(error.message));
            }
        });

    program
        .command("makeSnapshot [path]")
        .description("")
        .action(async (path) => {
            if (!path) {
                path = shelljs.exec("npm config get local_packages_folder").stdout.trim();
            }
            const { ok, snapshot } = await makeSnapshot(path);

            if (!ok) {
                process.exit(1);
            }

            console.dir(snapshot);
        });

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
            massReplace;
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
        .command("clean_frontend")
        .description("Cleans ts output directory")
        .action(function clean_frontend_cmd(targetPath, options, command) {
            cleanFrontend();
        });

    program
        .command("clean_docs")
        .description("Cleans docs directory")
        .action(function clean_docs(targetPath, options, command) {
            cleanDocs();
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

    program
        .command("fix_cpls")
        .description("Makes all 'CODE????????' unique inside src folder")
        .action(function fix_cpl_cmd(targetPath, options, command) {
            fix_cpls();
        });

    program
        .command("inprint")
        .description("Executes inprint for src folder")
        .action(function inprint_cmd(targetPath, options, command) {
            inprintRunFromCmd();
        });

    program
        .command("add_js_to_imports")
        .description("Executes inprint for src folder")
        .action(function add_js_to_imports_cmd(targetPath, options, command) {
            add_js_to_imports();
        });

    program
        .command("precompile")
        .description("Adds .js extension to all imports, fixes cpl, executes inprint for src folder")
        .action(function precompile_cmd(targetPath, options, command) {
            add_js_to_imports();
            fix_cpls();
            inprintRunFromCmd();
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
