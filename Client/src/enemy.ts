import { Container, Sprite, Texture } from "pixi.js";
import { State } from "./state";
import { Tower } from "./tower";
import enemyStatsData from "./enemies.json";
import { Particle, ParticleStats } from "./particle";
import { IDamageable } from "./damageable";
import { IDestructable } from "./destructable";

export class EnemyStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly attackTime: number;
    public readonly speed: number;
    public readonly health: number;
    public readonly value: number;

    constructor(name: string, textureIndex: number, damage: number, attackTime: number, speed: number, health: number, value: number) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.attackTime = attackTime;
        this.speed = speed;
        this.health = health;
        this.value = value;
    }

    private static loadEnemyStats = (): EnemyStats[] => {
        let enemyStats = [];

        for (let data of enemyStatsData) {
            enemyStats.push(new EnemyStats(
                data.name,
                data.textureIndex,
                data.damage,
                data.attackTime,
                data.speed,
                data.health,
                data.value,
            ));
        }

        return enemyStats;
    }

    public static readonly loadedEnemyStats = this.loadEnemyStats();
}

export class Enemy implements IDamageable, IDestructable {
    public readonly stats: EnemyStats;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private health: number;
    private attackTimer: number;
    private readonly container: Container;

    constructor(stats: EnemyStats, x: number, lane: number, tileSize: number, textures: Texture[], container: Container) {
        this.stats = stats;
        this.health = stats.health;
        this.attackTimer = 0;
        this.x = x;
        this.y = lane * tileSize;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
        this.container = container;
    }

    update = (deltaTime: number, state: State) => {
        this.attackTimer += deltaTime;

        const tileX = this.x / state.map.tileSize;
        const tileY = this.y / state.map.tileSize;
        const tower = state.map.getTower(tileX, tileY);

        if (!tower.stats.empty) {
            if (this.attackTimer < this.stats.attackTime) {
                return;
            }

            this.attackTimer = 0;

            if (tower.takeDamage(this.stats.damage, state)) {
                state.map.setTower(state, tileX, tileY, Tower.empty);
            }

            return;
        }

        this.x -= this.stats.speed * deltaTime;
        this.sprite.x = this.x;
    }

    takeDamage = (damage: number, state: State): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            this.destroy(state);
            return true;
        }

        return false;
    }

    destroy = (state: State) => {
        state.particles.push(new Particle(this.x, this.y, ParticleStats.cloud, state.particleTextures, this.container));
        this.container.removeChild(this.sprite);
    }

    getY = () => {
        return this.y;
    }

    getX = () => {
        return this.x;
    }
}