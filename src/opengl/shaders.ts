import { GL3 as GL } from "allofw";
import * as allofw from "allofw";

function getShaderInfoLog(shader: GL.Shader) {
    var buffer = new Buffer(4);
    GL.getShaderiv(shader, GL.INFO_LOG_LENGTH, buffer);
    var length = buffer.readUInt32LE(0);
    if(length > 0) {
        var buf = new Buffer(length);
        GL.getShaderInfoLog(shader, length, buffer, buf);
        return buf.toString("utf-8");
    }
}

function isShaderCompiled(shader: GL.Shader) {
    var buffer = new Buffer(4);
    GL.getShaderiv(shader, GL.COMPILE_STATUS, buffer);
    var success = buffer.readUInt32LE(0);
    return success != 0;
}

function isProgramLinked(program: GL.Program) {
    var buffer = new Buffer(4);
    GL.getProgramiv(program, GL.LINK_STATUS, buffer);
    var success = buffer.readUInt32LE(0);
    return success != 0;
}

function getProgramInfoLog(program: GL.Program) {
    var buffer = new Buffer(4);
    GL.getProgramiv(program, GL.INFO_LOG_LENGTH, buffer);
    var length = buffer.readUInt32LE(0);
    if(length > 0) {
        var buf = new Buffer(length);
        GL.getProgramInfoLog(program, length, buffer, buf);
        return buf.toString("utf-8");
    }
}

export class ShaderException extends Error {
    constructor(type: string) {
        super("could not compile " + type + " shader");
        this.name = "ShaderException";
    }
}

export interface IShaders {
    vertex: string;
    fragment: string;
    geometry: string;
}

export function compileShaders(shaders: IShaders) {
    let shaderVertex: GL.Shader;
    let shaderFragment: GL.Shader;
    let shaderGeometry: GL.Shader;
    if(shaders.vertex) {
        shaderVertex = GL.createShader(GL.VERTEX_SHADER);
        GL.shaderSource(shaderVertex, [shaders.vertex]);
        GL.compileShader(shaderVertex);
        let log = getShaderInfoLog(shaderVertex);
        if(log && log.trim() != "") {
            console.log(log);
        }
        if(!isShaderCompiled(shaderVertex)) {
            throw new ShaderException("vertex");
        }
    }
    if(shaders.fragment) {
        shaderFragment = GL.createShader(GL.FRAGMENT_SHADER);
        GL.shaderSource(shaderFragment, [shaders.fragment]);
        GL.compileShader(shaderFragment);
        let log = getShaderInfoLog(shaderFragment);
        if(log && log.trim() != "") {
            console.log(log);
        }
        if(!isShaderCompiled(shaderFragment)) {
            throw new ShaderException("fragment");
        }
    }
    if(shaders.geometry) {
        shaderGeometry = GL.createShader(GL.GEOMETRY_SHADER);
        GL.shaderSource(shaderGeometry, [shaders.geometry]);
        GL.compileShader(shaderGeometry);
        let log = getShaderInfoLog(shaderFragment);
        if(log && log.trim() != "") {
            console.log(log);
        }
        if(!isShaderCompiled(shaderGeometry)) {
            throw new ShaderException("geometry");
        }
    }

    let program = GL.createProgram();

    if(shaderVertex) GL.attachShader(program, shaderVertex);
    if(shaderFragment) GL.attachShader(program, shaderFragment);
    if(shaderGeometry) GL.attachShader(program, shaderGeometry);

    GL.linkProgram(program);

    let log = getProgramInfoLog(program);
    if(log && log.trim() != "") {
        console.log(log);
    }
    if(!isProgramLinked(program)) {
        throw new ShaderException("link");
    }
    return program;
}

export function checkGLError(prefix: string) {
    let err = GL.getError();
    if(err != 0) {
        if(prefix) {
            allofw.log(allofw.kInfo, "OpenGL Error #" + err + " at " + prefix);
        } else {
            allofw.log(allofw.kInfo, "OpenGL Error #" + err);
        }
    }
}
