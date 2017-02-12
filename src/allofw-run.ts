#!/usr/bin/env node

import { runAllofwApp } from "./app/app";
import * as path from "path";

let args = process.argv.slice(2);

function printUsageAndExit() {
    console.log("Usage: allofw-run --config allofw.yaml --role simulator|renderer|both module.js");
    process.exit(0);
}

if(args.length == 0) {
    printUsageAndExit();
}

let config = "allofw.yaml";
let role = "both";
let runModule: string = null;

let i = 0;
for(; i < args.length; i++) {
    if(args[i] == "--config") {
        config = args[i + 1];
        i += 1;
    } else if(args[i] == "--role") {
        role = args[i + 1];
        i += 1;
    } else {
        break;
    }
}
if(args[i]) {
    runModule = args[i];
}

if(runModule != null) {
    let m = require(path.resolve(process.cwd(), runModule));
    runAllofwApp({
        config: config,
        role: role,
        module: m
    });
} else {
    printUsageAndExit();
}