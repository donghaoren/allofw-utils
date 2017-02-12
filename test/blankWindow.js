class Renderer {
    constructor(app) {
        app.networking.on("test", (arg1, arg2) => {
            console.log("renderer received test with args", arg1, arg2);
        });
    }

    render() {
    }
}

class Simulator {
    constructor(app) {
        setInterval(() => {
            app.networking.broadcast("test", "a1", "a2");
        }, 1000);
    }
}

exports.renderer = Renderer;
exports.simulator = Simulator;