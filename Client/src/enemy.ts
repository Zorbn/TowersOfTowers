import { Container, Sprite, Texture } from "pixi.js";
import { State } from "./state";
import { Tower } from "./tower";

export class EnemyStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly attackTime: number;
    public readonly speed: number;
    public readonly health: number;

    constructor(name: string, textureIndex: number, damage: number, attackTime: number, speed: number, health: number) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.attackTime = attackTime;
        this.speed = speed;
        this.health = health;
    }

    public static readonly zombie = new EnemyStats("Zombie", 0, 10, 0.5, 5, 20);
    public static readonly speedyZombie = new EnemyStats("Speedy Zombie", 1, 10, 0.5, 10, 10);
}

export class Enemy {
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

            if (tower.takeDamage(this.stats.damage)) {
                state.map.setTower(state, tileX, tileY, Tower.empty);
            }

            return;
        }

        this.x -= this.stats.speed * deltaTime;
        this.sprite.x = this.x;
    }

    // Returns true if the enemy has died for taking damage.
    takeDamage = (damage: number): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            this.destroy();
            return true;
        }

        return false;
    }

    destroy = () => {
        this.container.removeChild(this.sprite);
    }

    getY = () => {
        return this.y;
    }

    getX = () => {
        return this.x;
    }
}