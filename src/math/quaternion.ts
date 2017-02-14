import { Vector3 } from "./vector";

export class Quaternion {
    public v: Vector3;
    public w: number;

    constructor(v: Vector3 = new Vector3(0, 0, 0), w: number = 1) {
        this.v = v;
        this.w = w;
    }

    public conj(): Quaternion {
        return new Quaternion(this.v.scale(-1), this.w);
    }

    public mul(q2: Quaternion): Quaternion {
        let w = this.w * q2.w - this.v.dot(q2.v);
        let v = q2.v.scale(this.w).add(this.v.scale(q2.w)).add(this.v.cross(q2.v));
        return new Quaternion(v, w);
    }

    public rotate(vector: Vector3): Vector3 {
        let vq = new Quaternion(vector, 0);
        return this.mul(vq).mul(this.conj()).v;
    }

    public static Rotation(axis: Vector3, angle: number): Quaternion {
        return new Quaternion(axis.normalize().scale(Math.sin(angle / 2)), Math.cos(angle / 2));
    }

    public normalize(): Quaternion {
        let s = 1.0 / Math.sqrt(this.v.x * this.v.x + this.v.y * this.v.y + this.v.z * this.v.z + this.w * this.w);
        return new Quaternion(this.v.scale(s), this.w * s);
    }

    public static Slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
        let acos_arg = q1.v.x * q2.v.x + q1.v.y * q2.v.y + q1.v.z * q2.v.z + q1.w * q2.w;
        if(acos_arg > 1) acos_arg = 1;
        if(acos_arg < -1) acos_arg = -1;
        let omega = Math.acos(acos_arg);
        let st0: number, st1: number;
        if(Math.abs(omega) < 1e-10) {
            st0 = 1 - t;
            st1 = t;
        } else {
            let som = Math.sin(omega);
            st0 = Math.sin((1 - t) * omega) / som;
            st1 = Math.sin(t * omega) / som;
        }
        return new Quaternion(
            new Vector3(
                q1.v.x * st0 + q2.v.x * st1,
                q1.v.y * st0 + q2.v.y * st1,
                q1.v.z * st0 + q2.v.z * st1
            ),
            q1.w * st0 + q2.w * st1
        );
    }

    public slerp(q2: Quaternion, t: number): Quaternion {
        return Quaternion.Slerp(this, q2, t);
    }
}