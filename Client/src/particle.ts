import { Container, Sprite, Texture } from "pixi.js";
import { State } from "./state";

const PARTICLE_FPS = 10;

export class ParticleStats {
    public readonly frameCount: number;
    public readonly textureIndex: number;

    // TODO: Currently all sprite sheets use textureIndex in a way
    // that only supports the first row of sprites being accessed.
    constructor(textureIndex: number, frameCount: number) {
        this.textureIndex = textureIndex;
        this.frameCount = frameCount;
    }

    public static readonly cloud = new ParticleStats(0, 7);
    public static readonly smoke = new ParticleStats(7, 4);
}

export class Particle {
    private time: number;
    private sprite: Sprite;
    private stats: ParticleStats;
    private container: Container;

    constructor(x: number, y: number, stats: ParticleStats, textures: Texture[], container: Container) {
        this.container = container;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = x;
        this.sprite.y = y;
        this.stats = stats;
        this.container.addChild(this.sprite);
        this.time = 0;
    }

    // Returns true when the particle has completed it's animation.
    update = (state: State, deltaTime: number) => {
        this.time += deltaTime;
        const spriteI = Math.floor(this.time * PARTICLE_FPS);

        if (spriteI >= this.stats.frameCount) {
            return true;
        }

        this.sprite.texture = state.particleTextures[this.stats.textureIndex + spriteI];
        return false;
    }

    // TODO: IDestructable?
    destroy = () => {
        this.container.removeChild(this.sprite);
    }
}