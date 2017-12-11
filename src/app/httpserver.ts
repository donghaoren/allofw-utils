import * as allofw from "allofw";
import { IAllofwConfig } from "./config";
import { EventEmitter } from "events";
import * as express from "express";
import * as http from "http";
import * as socket_io from "socket.io";

export class HTTPServer extends EventEmitter {
    private sockets: Set<SocketIO.Socket>;
    private app: express.Application;
    private current_message_queue: [ string, any[] ][];
    private rpc_callbacks: { [ name: string ]: (...args: any[]) => Promise<any> | any };

    constructor(config: IAllofwConfig) {
        super();

        var app = express();
        var httpServer = http.createServer(app);
        var io = socket_io(httpServer);

        // Allow all origin
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        if(config.http.static) {
            app.use(express.static(config.http.static));
        }

        httpServer.listen(config.http.port, function() {
            allofw.log(allofw.kInfo, "HTTPServer: Listening on port " + config.http.port);
        });

        this.sockets = new Set();

        io.on('connection', (socket) => {
            allofw.log(allofw.kInfo, "New connection: " + socket.id);

            this.sockets.add(socket);

            socket.on('disconnect', () => {
                allofw.log(allofw.kInfo, "Connection closed: " + socket.id);
                this.sockets.delete(socket);
            });

            socket.on('m', (msg: any[]) => {
                this.emit(msg[0], ...msg[1]);
            });

            socket.on('r', (msg: any[]) => {
                let r: Promise<any> | any;
                try {
                    r = this.rpc_callbacks[msg[1]](...msg[2]);
                } catch(e) {
                    socket.emit("s", [ msg[0], e.message, null ]);
                    return;
                }
                if(r instanceof Promise) {
                    r.then((result) => {
                        socket.emit("s", [ msg[0], null, result ]);
                    });
                    r.catch((reason) => {
                        socket.emit("s", [ msg[0], reason, null ]);
                    });
                } else {
                    socket.emit("s", [ msg[0], null, r ]);
                }
            });
        });

        this.app = app;
        this.rpc_callbacks = {};

        this.current_message_queue = [];
        setInterval(() => {
            if(this.current_message_queue.length > 0) {
                for(var item of this.sockets) {
                    item.emit("b", this.current_message_queue);
                }
            }
            this.current_message_queue = [];
        }, 200);

        app.get("/io.js", (req, res) => {
            res.header("content-type", "text/javascript; charset=utf-8");
            res.status(200);
            res.send(`
                var server = (function() {
                    var socket = io();
                    var rpcHandlers = new Map();
                    var broadcastHandlers = new Map();
                    socket.on("b", (argss) => {
                        for(let args of argss) {
                            if(broadcastHandlers.has(args[0])) {
                                broadcastHandlers.get(args[0]).forEach(h => h(...args[1]));
                            }
                        }
                    });
                    socket.on("s", (args) => {
                        if(rpcHandlers.has(args[0])) {
                            rpcHandlers.get(args[0])(args[1], args[2]);
                        }
                    });
                    return {
                        message: (path, ...args) => {
                            socket.emit('m', [
                                path, args
                            ]);
                        },
                        rpc: (path, ...args) => {
                            return new Promise((resolve, reject) => {
                                var index = new Date().getTime().toString() + Math.random();
                                rpcHandlers.set(index, (error, result) => {
                                    rpcHandlers.delete(index);
                                    if(error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                });
                                socket.emit('r', [
                                    index, path, args
                                ]);
                            });
                        },
                        on: (path, callback) => {
                            if(!broadcastHandlers.has(path)) {
                                broadcastHandlers.set(path, new Set());
                            }
                            broadcastHandlers.get(path).add(callback);
                        }
                    };
                })();
            `);
        });
    }

    public broadcast(path: string, ...args: any[]) {
        this.current_message_queue.push([ path, args ]);
    }

    public rpc(path: string, callback: (...args: any[]) => Promise<any> | any) {
        this.rpc_callbacks[path] = callback;
    }

    public addStatic(path: string, staticFiles: string) {
        this.app.use(path, express.static(staticFiles));
    }
}