import { ParticleSpawner } from "./particleSpawner";

export interface IDamageable {
    // Returns true if the entity has died.
    takeDamage: (damage: number, particleSpawner: ParticleSpawner) => boolean;
}