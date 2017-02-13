import { OpenGLWindow, OmniStereo } from "allofw";
import { Vector3, Quaternion, Pose } from "../math/math";
import { EventEmitter } from "events";
import { HTTPServer } from "./httpserver";

export abstract class Navigation extends EventEmitter {
    public abstract get pose(): Pose;
    public abstract update(): void;
    public abstract setPosition(position: Vector3): void;
    public abstract setRotation(rotation: Quaternion): void;
    public abstract setHomePosition(position: Vector3): void;
    public abstract setHomeRotation(rotation: Quaternion): void;
}

export class WindowNavigation extends Navigation {
    private _pose: Pose;
    private _poseTarget: Pose;
    private _homePosition: Vector3;
    private _homeRotation: Quaternion;
    private _velocity: number[];
    private _velocityPrevious: number[];
    private _keys: { [ name: string ]: number[]; };
    private _t0: number;
    private _omnistereo: OmniStereo;

    constructor(window: OpenGLWindow, omnistereo: OmniStereo) {
        super();
        this._keys = {
            "W"      : [ 0,  0,  0, -1,  0,  0 ],
            "X"      : [ 0,  0,  0, +1,  0,  0 ],
            "A"      : [ 0, -1,  0,  0,  0,  0 ],
            "D"      : [ 0, +1,  0,  0,  0,  0 ],
            "Q"      : [ 0,  0, +1,  0,  0,  0 ],
            "Z"      : [ 0,  0, -1,  0,  0,  0 ],
            "UP"     : [ 0,  0,  0,  0,  0, +1 ],
            "DOWN"   : [ 0,  0,  0,  0,  0, -1 ],
            "LEFT"   : [ 0,  0,  0,  0, +1,  0 ],
            "RIGHT"  : [ 0,  0,  0,  0, -1,  0 ]
        };
        this._omnistereo = omnistereo;
        this._pose = new Pose(new Vector3(0, 0, 0), new Quaternion(new Vector3(0, 0, 0), 1));
        this._velocity = [ 0, 0, 0, 0, 0 ];
        this._velocityPrevious = [ 0, 0, 0, 0, 0 ];

        this._poseTarget = null;

        this._homePosition = new Vector3(0, 0, 0);
        this._homeRotation = new Quaternion(new Vector3(0, 0, 0), 1);

        window.onKeyboard((key, action, modifiers, scancode) => {
            if(key == "O") {
                this._poseTarget = new Pose(this._homePosition, this._homeRotation);
                this._velocityPrevious = [ 0, 0, 0, 0, 0 ];
            }
            if(action == "PRESS") {
                this._poseTarget = null;
                if(this._keys[key]) {
                    this._keys[key][0] = 1;
                }
            }
            if(action == "RELEASE") {
                if(this._keys[key]) {
                    this._keys[key][0] = 0;
                }
            }
            if(action == "PRESS" && key == "ESCAPE") {
                window.close();
            }
            this.emit("keyboard", key, action, modifiers, scancode);
        });

        this._t0 = new Date().getTime() / 1000;
    }

    public get pose(): Pose {
        return this._pose;
    }

    public update() {
        let t = new Date().getTime() / 1000;
        this.updateDT(t - this._t0);
        this._t0 = t;
    }

    private updateDT(dt: number) {
        var vs = [ 0, 0, 0, 0, 0 ];
        for(var key in this._keys) {
            for(var i = 0; i < 5; i++) {
                vs[i] += this._keys[key][i + 1] * this._keys[key][0];
            }
        }
        var blend = Math.pow(1 - 0.5, dt * 10);
        for(var i = 0; i < 5; i++) {
            vs[i] = this._velocityPrevious[i] * blend + vs[i] * (1 - blend);
            this._velocityPrevious[i] = vs[i];
        }
        var speed = 5;
        this._pose.position = this._pose.position.add(this._pose.rotation.rotate(new Vector3(vs[0], vs[1], vs[2])).scale(speed * dt))
        this._pose.rotation = Quaternion.rotation(new Vector3(0, 1, 0), vs[3] * dt).mul(this._pose.rotation)
        this._pose.rotation = this._pose.rotation.mul(Quaternion.rotation(new Vector3(1, 0, 0), vs[4] * dt))

        if(this._poseTarget) {
            this._pose.position = this._pose.position.interp(this._poseTarget.position, 1 - blend);
            this._pose.rotation = this._pose.rotation.slerp(this._poseTarget.rotation, 1 - blend);
        }

        this._omnistereo.setPose(
            this._pose.position.x, this._pose.position.y, this._pose.position.z,
            this._pose.rotation.v.x, this._pose.rotation.v.y, this._pose.rotation.v.z, this._pose.rotation.w
        );
    }

    public setPosition(position: Vector3) {
        this._pose.position = position;
    }

    public setRotation(rotation: Quaternion) {
        this._pose.rotation = rotation;
    }

    public setHomePosition(position: Vector3) {
        this._homePosition = position;
    }

    public setHomeRotation(rotation: Quaternion) {
        this._homeRotation = rotation;
    }
}

export class NetworkNavigation extends Navigation {
    private _pose: Pose;
    private _poseTarget: Pose;
    private _homePosition: Vector3;
    private _homeRotation: Quaternion;
    private _velocity: number[];
    private _velocityPrevious: number[];
    private _keys: { [ name: string ]: number[]; };
    private _t0: number;

    constructor(networking: HTTPServer) {
        super();
        this._keys = {
            "W"      : [ 0,  0,  0, -1,  0,  0 ],
            "X"      : [ 0,  0,  0, +1,  0,  0 ],
            "A"      : [ 0, -1,  0,  0,  0,  0 ],
            "D"      : [ 0, +1,  0,  0,  0,  0 ],
            "Q"      : [ 0,  0, +1,  0,  0,  0 ],
            "Z"      : [ 0,  0, -1,  0,  0,  0 ],
            "UP"     : [ 0,  0,  0,  0,  0, +1 ],
            "DOWN"   : [ 0,  0,  0,  0,  0, -1 ],
            "LEFT"   : [ 0,  0,  0,  0, +1,  0 ],
            "RIGHT"  : [ 0,  0,  0,  0, -1,  0 ]
        };
        this._pose = new Pose(new Vector3(0, 0, 0), new Quaternion(new Vector3(0, 0, 0), 1));
        this._velocity = [ 0, 0, 0, 0, 0 ];
        this._velocityPrevious = [ 0, 0, 0, 0, 0 ];
        this._poseTarget = null;

        this._homePosition = new Vector3(0, 0, 0);
        this._homeRotation = new Quaternion(new Vector3(0, 0, 0), 1);


        this._t0 = new Date().getTime() / 1000;

        networking.on("nav", (l_x: number | string, l_y: number, l_z: number, r_x: number, r_y: number) => {
            if(l_x == "reset") {
                this._poseTarget = {
                    position: this._homePosition,
                    rotation: this._homeRotation
                };
                this._velocityPrevious = [ 0, 0, 0, 0, 0 ];
            } else {
                l_x = l_x as number;
                this._poseTarget = null;
                this._keys["D"][0] = l_x > 0 ? 0 : l_x;
                this._keys["A"][0] = l_x < 0 ? 0 : -l_x;
                this._keys["Z"][0] = l_y > 0 ? 0 : l_y;
                this._keys["Q"][0] = l_y < 0 ? 0 : -l_y;
                this._keys["X"][0] = l_z > 0 ? 0 : l_z;
                this._keys["W"][0] = l_z < 0 ? 0 : -l_z;

                this._keys["DOWN"][0] = r_y > 0 ? 0 : r_y;
                this._keys["UP"][0] = r_y < 0 ? 0 : -r_y;
                this._keys["RIGHT"][0] = r_x > 0 ? 0 : r_x;
                this._keys["LEFT"][0] = r_x < 0 ? 0 : -r_x;
            }
        });
    }

    public get pose(): Pose {
        return this._pose;
    }

    public update() {
        var t = new Date().getTime() / 1000;
        this.updateDT(t - this._t0);
        this._t0 = t;
    };

    public updateDT(dt: number) {
        var vs = [ 0, 0, 0, 0, 0 ];
        for(var key in this._keys) {
            for(var i = 0; i < 5; i++) {
                vs[i] += this._keys[key][i + 1] * this._keys[key][0];
            }
        }
        var blend = Math.pow(1 - 0.5, dt * 10);
        for(var i = 0; i < 5; i++) {
            vs[i] = this._velocityPrevious[i] * blend + vs[i] * (1 - blend);
            this._velocityPrevious[i] = vs[i];
        }
        var speed = 5;
        this._pose.position = this._pose.position.add(this._pose.rotation.rotate(new Vector3(vs[0], vs[1], vs[2])).scale(speed * dt))
        this._pose.rotation = Quaternion.rotation(new Vector3(0, 1, 0), vs[3] * dt).mul(this._pose.rotation)
        this._pose.rotation = this._pose.rotation.mul(Quaternion.rotation(new Vector3(1, 0, 0), vs[4] * dt))

        if(this._poseTarget) {
            this._pose.position = this._pose.position.interp(this._poseTarget.position, 1 - blend);
            this._pose.rotation = this._pose.rotation.slerp(this._poseTarget.rotation, 1 - blend);
        }

        this.emit("pose",
            this._pose.position.x, this._pose.position.y, this._pose.position.z,
            this._pose.rotation.v.x, this._pose.rotation.v.y, this._pose.rotation.v.z, this._pose.rotation.w
        );
    }

    public setPosition(position: Vector3) {
        this._pose.position = position;
    }

    public setRotation(rotation: Quaternion) {
        this._pose.rotation = rotation;
    }

    public setHomePosition(position: Vector3) {
        this._homePosition = position;
    }

    public setHomeRotation(rotation: Quaternion) {
        this._homeRotation = rotation;
    }
};
