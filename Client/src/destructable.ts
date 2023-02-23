import { ParticleSpawner } from "./particleSpawner";

export interface IDestructable {
    destroy(particleSpawner: ParticleSpawner): void;
}