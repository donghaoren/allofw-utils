import * as allofw from "allofw";
import * as fs from "fs";
import { IAllofwConfig } from "./config";

import * as yaml from "js-yaml";

export interface IApplicationRuntime {
    server: HTTPServer;
    config: IAllofwConfig;
    networking: Networking;
}

export interface IApplicationModule {
    renderer: class;
    simulator: (app: IApplicationRuntime) => void;
}

export interface IApplicationInfo {
    config?: string;
    role?: "simulator" | "renderer" | "both";
    module: IApplicationModule;
}

export function runAllofwApp(info: IApplicationInfo) {
    let configFile = info.config ? info.config : "allofw.yaml";
    let config = yaml.load(fs.readFileSync(configFile, "utf-8"));
    if(info.role) {
        let role = info.role;
    } else {
        let role = config.role;
    }
    let appModule = info.module;

    function StartRenderer() {
        var GL = allofw.GL3;

        var window = new allofw.OpenGLWindow({ config: configFile });
        window.makeContextCurrent();
        var omni = new allofw.OmniStereo(configFile);
        var networking = new allofwutils.Networking(config, "renderer");
        var nav = new allofwutils.WindowNavigation(window, omni);

        var app = { GL: GL, window: window, navigation: nav, omni: omni, config: config, networking: networking };
        var renderer = new appModule.renderer(app);

        // Main rendering code.
        omni.onCaptureViewport(function() {
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            if(renderer.render) renderer.render();
        });

        // Main loop (called by timer below).
        function render() {
            omni.capture();
            sz = window.getFramebufferSize();
            omni.composite(0, 0, sz[0], sz[1]);
            window.swapBuffers();
        }

        timer = setInterval(function() {
            nav.update();
            render();
            window.pollEvents();

            if(window.shouldClose()) {
                clearInterval(timer);
            }
        });

        window.onClose(function() {
            clearInterval(timer);
        });
    }

    function StartSimulator() {
        var allofwutils = require("allofwutils");
        var networking = new allofwutils.Networking(config, "simulator");
        if(config.http) {
            var server = new allofwutils.HTTPServer(config);
        }
        var app = { server: server, config: config, networking: networking };
        var simulator = new appModule.simulator(app);
    }

    if(role == "renderer") {
        StartRenderer();
    }

    if(role == "simulator") {
        StartSimulator();
    }

    if(role == "both") {
        StartRenderer();
        StartSimulator();
    }
}