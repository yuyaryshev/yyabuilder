require("shelljs-plugin-clear");
require("shelljs-plugin-inspect");
require('shelljs-plugin-open');
require('shelljs-plugin-clear');
require('shelljs-plugin-ssh');

const shelljs_exec = require("shelljs.exec");
//const shelljs = require("shelljs");
const shelljs = require('shelljs-exec-proxy');
shelljs.exec = shelljs_exec;

// Promise based archiving utility based on shelljs that assumes it runs on a unix type machine wich has the tar archiving utility installed
//
// Usual stuff:
//
//     npm i shell-tar -S
// Main exported functions are: compress and decompress Both have the same argument signature: scr, dest, move Quite self explanatory. move may be any truthy value.

module.exports = {shelljs, shelljs_exec};//{ shelljs: Object.assign({}, shelljs, { exec: require("shelljs") }) };
