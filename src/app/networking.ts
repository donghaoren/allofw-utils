import { IAllofwConfig } from "./config";
import { EventEmitter } from "events";
import * as zmq from "zmq";
import * as allofw from "allofw";
import * as os from "os";

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

export class Networking extends EventEmitter {
    private _socket: zmq.Socket;
    private _socketFeedback: zmq.Socket;
    private _renderers: Set<string>;

    constructor(config: IAllofwConfig, role: "renderer" | "simulator") {
        super();
        if(config.broadcasting) {
            if(role == "renderer") {
                if(config.broadcasting.renderer && config.broadcasting.renderer.sub) {
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
                    allofw.log(allofw.kInfo, "Renderer: listening on " + config.broadcasting.renderer.sub);
                }
                if(config.broadcasting.renderer && config.broadcasting.renderer.push) {
                    this._socketFeedback = zmq.socket("push");
                    this._socketFeedback.connect(config.broadcasting.renderer.push);
                    allofw.log(allofw.kInfo, "Renderer: sending feedback to " + config.broadcasting.renderer.push);
                    this.feedback("start", this.getIdentifier());
                    this.on("barrier", (id: string) => {
                        this.feedback("barrier", id, this.getIdentifier());
                    });
                }
            }
            if(role == "simulator") {
                this._renderers = new Set<string>();
                if(config.broadcasting.simulator && config.broadcasting.simulator.pub) {
                    this._socket = zmq.socket("pub");
                    this._socket.bind(config.broadcasting.simulator.pub);
                    allofw.log(allofw.kInfo, "Simulator: braodcasting on " + config.broadcasting.simulator.pub);
                }
                if(config.broadcasting.simulator && config.broadcasting.simulator.pull) {
                    this._socketFeedback = zmq.socket("pull");
                    this._socketFeedback.bind(config.broadcasting.simulator.pull);
                    allofw.log(allofw.kInfo, "Simulator: receiving feedback at " + config.broadcasting.simulator.pull);
                    this._socketFeedback.on("message", (msg: Buffer) => {
                        try {
                            let obj = JSON.parse(msg.toString("utf-8"));
                            if(obj[0] == "start") {
                                console.log("Simulator: renderer " + obj[1][0] + " started")
                                this._renderers.add(obj[1][0]);
                            }
                            this.emit(obj[0], ...obj[1]);
                        } catch(e) {
                            console.log(e.stack);
                        }
                    });
                }
            }
        }
    }

    public getIdentifier() {
        return os.hostname() + "/" + process.pid.toString()
    }

    public barrier(timeout: number = 1000) {
        return new Promise<void>((resolve, reject) => {
            let totalCount = 0;
            let received = new Set<string>();
            let barrierID = guid();
            this.broadcast("barrier", barrierID);
            let onBarrier = (id: string, name: string) => {
                if(id != barrierID) return;
                received.add(name);
                if(received.size == this._renderers.size) {
                    this.removeListener("barrier", onBarrier);
                    if(timeoutTimer != null) clearTimeout(timeoutTimer);
                    resolve();
                }
            }
            let timeoutTimer = setTimeout(() => {
                this.removeListener("barrier", onBarrier);
                timeoutTimer = null;
                resolve();
            }, timeout);
            this.addListener("barrier", onBarrier);
        });
    }

    public feedback(path: string, ...args: any[]) {
        try {
            let obj = [ path, args ];
            this._socketFeedback.send(JSON.stringify(obj));
        } catch(e) {
            console.log(e.stack);
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
