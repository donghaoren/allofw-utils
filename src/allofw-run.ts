#!/usr/bin/env node

import { runAllofwApp, ISimulatorRuntime, IRendererRuntime } from "./app/app";
import * as path from "path";

let args = process.argv.slice(2);

function printUsageAndExit() {
    console.log("Usage:");
    console.log("    allofw-run [options] module.js");
    console.log("    allofw-run [options] simulator.js renderer.js");
    console.log("Options:");
    console.log("  --config [allofw.yaml] : specify config file");
    console.log("  --role [both]          : specify role file (simulator/renderer/both)");
    process.exit(0);
}

if(args.length == 0) {
    printUsageAndExit();
}

let config = "allofw.yaml";
let role = "both";
let runModule: string = null;
let rendererModule: string = null;
let simulatorModule: string = null;

let freeParameters: string[] = [];
for(let i = 0; i < args.length; i++) {
    if(args[i] == "--config") {
        config = args[i + 1];
        i += 1;
    } else if(args[i] == "--role") {
        role = args[i + 1];
        i += 1;
    } else {
        freeParameters.push(args[i]);
    }
}
if(freeParameters.length == 1) {
    runModule = freeParameters[0];
} else if(freeParameters.length == 2) {
    simulatorModule = freeParameters[0];
    rendererModule = freeParameters[1];
} else {
    printUsageAndExit();
}

if(runModule != null) {
    let m = require(path.resolve(process.cwd(), runModule));
    runAllofwApp({
        config: config,
        role: role,
        module: m
    });
} else if(simulatorModule != null && rendererModule != null) {
    class Simulator {
        constructor(app: ISimulatorRuntime) {
            require(path.resolve(process.cwd(), simulatorModule)).start(app);
        }
    }

    class Renderer {
        private renderer: any;

        constructor(app: IRendererRuntime) {
            this.renderer = require(path.resolve(process.cwd(), rendererModule));
            this.renderer.start(app);
        }

        render() {
            if(this.renderer.render) this.renderer.render();
        }

        frame() {
            if(this.renderer.frame) this.renderer.frame();
        }
    }
    runAllofwApp({
        config: config,
        role: role,
        module: {
            simulator: Simulator,
            renderer: Renderer
        }
    });
} else {
    printUsageAndExit();
}