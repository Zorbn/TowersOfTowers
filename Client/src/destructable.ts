import { State } from "./state";

export interface IDestructable {
    destroy(state: State): void;
}