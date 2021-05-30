#!/usr/bin/env node

import {readFileSync} from "fs";
console.log(`simple_cli ${JSON.parse(readFileSync("package.json")).version} started!`);
