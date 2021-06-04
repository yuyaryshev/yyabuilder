// {
//   error: null,
//   stdout: 'Successfully compiled 97 files with Babel (1541ms).\n',
//   stderr: '',
//   code: 0,
//   ok: true
// }
const chalk = require("chalk");

function printStd(callResult) {
    const { error, stdout, stderr, code, ok } = callResult;
    if (stdout.trim().length > 0 && stdout !== stderr) console.log(stdout);
    //if (stderr.trim().length > 0) console.log(chalk.red(stderr));
    return callResult;
}

module.exports = { printStd };
