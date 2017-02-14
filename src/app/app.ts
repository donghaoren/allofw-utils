import * as allofw from "allofw";
import * as fs from "fs";
import * as yaml from "js-yaml";

import { IAllofwConfig } from "./config";
import { Networking } from "./networking";
import { HTTPServer } from "./httpserver";

export interface ISimulatorRuntime {
    server?: HTTPServer;
    config?: IAllofwConfig;
    networking?: Networking;
}

export interface IRendererRuntime {
    GL: typeof allofw.GL3;
    window?: allofw.OpenGLWindow;
    omni?: allofw.OmniStereo;
    networking?: Networking;
}

export interface ISimulatorInstance {
}

export interface IRendererInstance {
    frame?: () => void;
    render?: () => void;
}

export interface IApplicationModule {
    renderer: new (app: IRendererRuntime) => IRendererInstance;
    simulator: new (app: ISimulatorRuntime) => ISimulatorInstance;
}

export interface IApplicationInfo {
    config?: string;
    role?: string;
    module: IApplicationModule;
}

export function runAllofwApp(info: IApplicationInfo) {
    let configFile = info.config ? info.config : "allofw.yaml";
    let config = yaml.load(fs.readFileSync(configFile, "utf-8"));
    let role = "null";
    if(info.role) {
        role = info.role;
    } else {
        role = config.role;
    }
    let appModule = info.module;

    function StartRenderer() {
        let GL = allofw.GL3;

        let window = new allofw.OpenGLWindow({ config: configFile });
        window.makeContextCurrent();
        let omni: allofw.OmniStereo | allofw.OpenVR.OmniStereo;
        if(config.OpenVR) {
            omni = new allofw.OpenVR.OmniStereo();
        } else {
            omni = new allofw.OmniStereo(configFile);
        }
        let networking = new Networking(config, "renderer");

        let app = { GL: GL, window: window, omni: omni, config: config, networking: networking };
        let renderer = new appModule.renderer(app);

        // Main rendering code.
        omni.onCaptureViewport(() => {
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            if(renderer.render) renderer.render();
        });

        // Main loop (called by timer below).
        function render() {
            if(renderer.frame) renderer.frame();
            omni.capture();
            let sz = window.getFramebufferSize();
            omni.composite(0, 0, sz[0], sz[1], null);
            window.swapBuffers();
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        }

        let timer = setInterval(() => {
            render();
            window.pollEvents();

            if(window.shouldClose()) {
                clearInterval(timer);
            }
        }, 1);

        window.onClose(() => {
            clearInterval(timer);
        });
    }

    function StartSimulator() {
        let networking = new Networking(config, "simulator");
        let server: HTTPServer = null;
        if(config.http) {
            server = new HTTPServer(config);
        }
        let app = { server: server, config: config, networking: networking };
        let simulator = new appModule.simulator(app);
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