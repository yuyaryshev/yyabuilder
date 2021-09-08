// @ts-ignore
import("shelljs-plugin-clear");

// @ts-ignore
import("shelljs-plugin-inspect");

// @ts-ignore
import("shelljs-plugin-open");

// @ts-ignore
import("shelljs-plugin-clear");

// @ts-ignore
import("shelljs-plugin-ssh");

// @ts-ignore
import shelljs_exec from "shelljs.exec";
// @ts-ignore
//import shelljs0 from "shelljs-exec-proxy";

// @ts-ignore
import shelljs0 from "shelljs";

//const shelljs from("shelljs");
shelljs0.exec = shelljs_exec;

// Promise based archiving utility based on shelljs that assumes it runs on a unix type machine wich has the tar archiving utility installed
//
// Usual stuff:
//
//     npm i shell-tar -S
// Main exported functions are: compress and decompress Both have the same argument signature: scr, dest, move Quite self explanatory. move may be any truthy value.

export const shelljs = shelljs0;
