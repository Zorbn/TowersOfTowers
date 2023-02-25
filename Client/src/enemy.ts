import { Container, Sprite } from "pixi.js";
import enemyStatsData from "./enemies.json";
import { ParticleStats } from "./particle";
import { IDamageable } from "./damageable";
import { IDestructable } from "./destructable";
import { TowerMap } from "./towerMap";
import { ParticleSpawner } from "./particleSpawner";
import { enemyTextures } from "./textureSheet";
import { TileMap } from "./tileMap";
import { Network } from "./network";
import { Ui } from "./ui";

export class EnemyStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly attackTime: number;
    public readonly speed: number;
    public readonly health: number;
    public readonly value: number;
    public readonly index: number;

    constructor(name: string, textureIndex: number, damage: number, attackTime: number, speed: number, health: number, value: number, index: number) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.attackTime = attackTime;
        this.speed = speed;
        this.health = health;
        this.value = value;
        this.index = index;
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
                enemyStats.length,
            ));
        }

        return enemyStats;
    }

    public static readonly loadedEnemyStats = this.loadEnemyStats();
}

export class Enemy implements IDamageable, IDestructable {
    public readonly stats: EnemyStats;
    public readonly lane: number;
    private readonly container: Container;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private health: number;
    private attackTimer: number;
    private moving: boolean;

    private static nextId: number = 0;

    constructor(stats: EnemyStats, x: number, lane: number, tileSize: number, container: Container, moving: boolean) {
        this.stats = stats;
        this.health = stats.health;
        this.attackTimer = 0;
        this.x = x;
        this.lane = lane;
        this.y = lane * tileSize;
        this.moving = moving;
        this.sprite = new Sprite(enemyTextures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
        this.container = container;
    }

    move = (deltaTime: number) => {
        if (!this.moving) {
            return;
        }

        this.x -= this.stats.speed * deltaTime;
        this.sprite.x = this.x;
    }

    setMoving = (moving: boolean) => {
        this.moving = moving;
    }

    isMoving = (): boolean => {
        return this.moving;
    }

    update = (id: number, towerMap: TowerMap, tileMap: TileMap, ui: Ui, particleSpawner: ParticleSpawner, network: Network, deltaTime: number) => {
        this.attackTimer += deltaTime;

        const tileX = this.x / towerMap.tileSize;
        const tileY = this.y / towerMap.tileSize;
        const tower = towerMap.getTower(tileX, tileY);

        let canMove = true;

        if (!tower.stats.empty) {
            if (this.attackTimer < this.stats.attackTime) {
                return;
            }

            this.attackTimer = 0;

            if (tower.takeDamage(this.stats.damage)) {
                towerMap.removeTower(tileX, tileY, tileMap, ui,
                    particleSpawner, network);
                network.syncRemoveTower(tileX, tileY);

            }

            canMove = false;
        }

        if (canMove != this.moving) {
            this.moving = canMove;
            network.syncSetEnemyMoving(id, this.moving);
        }

        this.move(deltaTime);
    }

    takeDamage = (damage: number): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            return true;
        }

        return false;
    }

    destroy = (particleSpawner: ParticleSpawner) => {
        particleSpawner.queue(this.x, this.y, ParticleStats.cloud);
        this.container.removeChild(this.sprite);
    }

    getX = () => {
        return this.x;
    }

    getY = () => {
        return this.y;
    }

    static getNextId = (): number => {
        return this.nextId++;
    }
}