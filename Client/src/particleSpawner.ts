import { Container } from "pixi.js";
import { Particle, ParticleStats } from "./particle";
import { particleTextures } from "./textureSheet";

type QueuedParticle = {
    x: number;
    y: number;
    stats: ParticleStats;
}

export class ParticleSpawner {
    private queuedParticles: QueuedParticle[];

    constructor() {
        this.queuedParticles = [];
    }

    queue = (x: number, y: number, stats: ParticleStats) => {
        this.queuedParticles.push({
            x,
            y,
            stats,
        });
    }

    update = (particles: Particle[], container: Container) => {
        for (let queuedParticle of this.queuedParticles) {
            particles.push(new Particle(queuedParticle.x, queuedParticle.y, queuedParticle.stats, particleTextures, container));
        }

        this.queuedParticles.splice(0, this.queuedParticles.length);
    }
}