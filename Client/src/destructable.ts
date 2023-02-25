import { ParticleSpawner } from "./particleSpawner";

export interface IDestructable {
    destroy: (particleSpawner: ParticleSpawner) => void;
}

export class DestructableMap<K, V extends IDestructable> {
    private map: Map<K, V>;

    constructor() {
        this.map = new Map();
    }

    has = (key: K): boolean => {
        return this.map.has(key);
    }

    set = (key: K, value: V, particleSpawner: ParticleSpawner): Map<K, V> => {
        this.destroy(key, particleSpawner);
        return this.map.set(key, value);
    }

    delete = (key: K, particleSpawner: ParticleSpawner): boolean => {
        this.destroy(key, particleSpawner);
        return this.map.delete(key);
    }

    get = (key: K): V | undefined => {
        return this.map.get(key);
    }

    clear = (particleSpawner: ParticleSpawner) => {
        for (let value of this.map.values()) {
            value.destroy(particleSpawner);
        }

        this.map.clear();
    }

    [Symbol.iterator] = (): IterableIterator<[K, V]> => {
        return this.map[Symbol.iterator]();
    }

    keys = (): IterableIterator<K> => {
        return this.map.keys();
    }

    values = (): IterableIterator<V> => {
        return this.map.values();
    }

    private destroy = (key: K, particleSpawner: ParticleSpawner) => {
        const oldValue = this.get(key);
        if (oldValue != undefined) {
            oldValue.destroy(particleSpawner);
        }
    }
}