import { IAllofwConfig } from "./config";
import { EventEmitter } from "events";
import * as zmq from "zmq";
import * as allofw from "allofw";

export class Networking extends EventEmitter {
    private _socket: zmq.Socket;

    constructor(config: IAllofwConfig, role: "renderer" | "simulator") {
        super();

        if(role == "renderer") {
            this._socket = zmq.socket("sub");
            this._socket.connect(config.broadcasting.renderer.sub);
            this._socket.subscribe("");
            this._socket.on("message", (msg: Buffer) => {
                try {
                    let obj = JSON.parse(msg.toString("utf-8"));
                    this.emit(obj[0], ...obj[1]);
                } catch(e) {
                    console.log(e.stack);
                }
            });
            allofw.log(allofw.kInfo, "Renderer: Listening on " + config.broadcasting.renderer.sub);
        }
        if(role == "simulator") {
            this._socket = zmq.socket("pub");
            this._socket.bind(config.broadcasting.simulator.pub);
            allofw.log(allofw.kInfo, "Simulator: Braodcasting on " + config.broadcasting.simulator.pub);
        }
    }

    public broadcast(path: string, ...args: any[]) {
        try {
            let obj = [ path, args ];
            this._socket.send(JSON.stringify(obj));
        } catch(e) {
            console.log(e.stack);
        }
    }
}
