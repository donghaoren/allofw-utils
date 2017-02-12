export class Vector3 {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    public add(v: Vector3): Vector3 {
        return new Vector3(v.x + this.x, v.y + this.y, v.z + this.z);
    }

    public sub(v: Vector3): Vector3 {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    public dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    public scale(s: number = 1): Vector3 {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    }

    public cross(v: Vector3): Vector3 {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    public normalize(): Vector3 {
        var l = this.length();
        return new Vector3(this.x / l, this.y / l, this.z / l);
    }

    public distance2(p: Vector3): number {
        return (this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y) + (this.z - p.z) * (this.z - p.z);
    }

    public distance(p: Vector3): number {
        return Math.sqrt(this.distance2(p));
    }

    public interp(v: Vector3, t: number = 0): Vector3 {
        return new Vector3(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t,
            this.z + (v.z - this.z) * t
        );
    }
}