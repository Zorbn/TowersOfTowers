import { Container, Sprite, Texture } from "pixi.js";
import { TowerMap } from "./towerMap";

export class EnemyStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly speed: number;
    public readonly health: number;

    constructor(name: string, textureIndex: number, damage: number, speed: number, health: number) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.speed = speed;
        this.health = health;
    }

    public static readonly zombie = new EnemyStats("Zombie", 0, 10, 5, 20);
    public static readonly speedyZombie = new EnemyStats("Speedy Zombie", 1, 10, 10, 10);
}

export class Enemy {
    public readonly stats: EnemyStats;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private health: number;
    private readonly container: Container;

    constructor(stats: EnemyStats, x: number, lane: number, tileSize: number, textures: Texture[], container: Container) {
        this.stats = stats;
        this.health = stats.health;
        this.x = x;
        this.y = lane * tileSize;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
        this.container = container;
    }

    update = (deltaTime: number, map: TowerMap) => {
        const tileX = this.x / map.tileSize;
        const tileY = this.y / map.tileSize;

        if (!map.getTowerStats(tileX, tileY).empty) {
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