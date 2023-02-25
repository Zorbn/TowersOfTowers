import { Container, Sprite, Texture } from "pixi.js";
import { IDestructable } from "./destructable";
import { ParticleSpawner } from "./particleSpawner";
import { particleTextures } from "../textureSheet";

const PARTICLE_FPS = 10;

export class ParticleStats {
    public readonly frameCount: number;
    public readonly textureIndex: number;

    constructor(textureIndex: number, frameCount: number) {
        this.textureIndex = textureIndex;
        this.frameCount = frameCount;
    }

    public static readonly cloud = new ParticleStats(0, 7);
    public static readonly smoke = new ParticleStats(7, 4);
    public static readonly dust = new ParticleStats(14, 4);
}

export class Particle implements IDestructable {
    private time: number;
    private sprite: Sprite;
    private stats: ParticleStats;
    private container: Container;

    constructor(x: number, y: number, stats: ParticleStats, textures: Texture[], container: Container) {
        this.container = container;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.zIndex = 1;
        this.stats = stats;
        this.container.addChild(this.sprite);
        this.time = 0;
    }

    // Returns true when the particle has completed it's animation.
    update = (deltaTime: number) => {
        this.time += deltaTime;
        const spriteI = Math.floor(this.time * PARTICLE_FPS);

        if (spriteI >= this.stats.frameCount) {
            return true;
        }

        this.sprite.texture = particleTextures[this.stats.textureIndex + spriteI];
        return false;
    }

    destroy = (_particleSpawner: ParticleSpawner) => {
        this.container.removeChild(this.sprite);
    }
}