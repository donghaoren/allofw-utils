import { Vector3 } from "./vector";
import { Quaternion } from "./quaternion";

export class Pose {
    public position: Vector3;
    public rotation: Quaternion;

    constructor(position: Vector3 = new Vector3(), rotation: Quaternion = new Quaternion()) {
        this.position = position;
        this.rotation = rotation;
    }
}