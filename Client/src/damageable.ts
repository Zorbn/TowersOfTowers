import { State } from "./state";

export interface IDamageable {
    // Returns true if the entity has died.
    takeDamage(damage: number, state: State): boolean;
}