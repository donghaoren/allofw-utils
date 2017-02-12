import * as allofw from "allofw";
import { IAllofwConfig } from "./config";
import { EventEmitter } from "events";
import * as express from "express";
import * as http from "http";
import * as socket_io from "socket.io";

export class HTTPServer extends EventEmitter {
    private sockets: Set<SocketIO.Socket>;
    private app: Express.Application;
    private current_message_queue: [ string, any[] ][];

    constructor(config: IAllofwConfig) {
        super();

        var app = express();
        var httpServer = http.createServer(app);
        var io = socket_io(http);

        // Allow all origin
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        app.use(express.static(config.http.static));

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
                try {
                    this.emit(msg[0], ...msg[1]);
                } catch(e) {
                    allofw.log(allofw.kInfo, e.stack);
                }
            });
        });

        this.app = app;

        this.current_message_queue = [];
        setInterval(() => {
            if(this.current_message_queue.length > 0) {
                for(var item of this.sockets) {
                    item.emit("ms", this.current_message_queue);
                }
            }
            this.current_message_queue = [];
        }, 200);
    }

    public broadcast(path: string, ...args: any[]) {
        this.current_message_queue.push([ path, args ]);
    };
}