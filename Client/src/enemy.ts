import { Container, Sprite, Texture } from "pixi.js";
import { TowerMap } from "./towerMap";

export class EnemyStats {
    public readonly name: string;
    public readonly damage: number;
    public readonly speed: number;
    public readonly textureIndex: number;

    constructor(name: string, textureIndex: number, damage: number, speed: number) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.speed = speed;
    }

    public static readonly zombie = new EnemyStats("Zombie", 0, 10, 5);
    public static readonly speedyZombie = new EnemyStats("Speedy Zombie", 1, 10, 10);
}

export class Enemy {
    public readonly stats: EnemyStats;
    private x: number;
    private y: number;
    private sprite: Sprite;

    constructor(stats: EnemyStats, x: number, lane: number, tileSize: number, textures: Texture[], container: Container) {
        this.stats = stats;
        this.x = x;
        this.y = lane * tileSize;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
    }

    move = (deltaTime: number, map: TowerMap) => {
        const tileX = this.x / map.tileSize;
        const tileY = this.y / map.tileSize;

        if (!map.getTower(tileX, tileY).empty) {
            return;
        }

        this.x -= this.stats.speed * deltaTime;
        this.sprite.x = this.x;
    }

    destroy = (container: Container) => {
        container.removeChild(this.sprite);
    }
}