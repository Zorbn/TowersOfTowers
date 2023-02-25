import { Container, Sprite } from "pixi.js";
import { DestructableMap, IDestructable } from "./destructable";
import { Enemy } from "./enemy";
import { Network } from "./network";
import { ParticleStats } from "./particle";
import { ParticleSpawner } from "./particleSpawner";
import { projectileTextures } from "./textureSheet";
import { TowerMap } from "./towerMap";
import { Ui } from "./ui";

export class ProjectileStats {
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly speed: number;
    public readonly towerIndex: number;

    constructor(textureIndex: number, damage: number, speed: number, towerIndex: number) {
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.speed = speed;
        this.towerIndex = towerIndex;
    }
}

export class Projectile implements IDestructable {
    public readonly stats: ProjectileStats;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private container: Container;

    private static nextId: number = 0;

    constructor(stats: ProjectileStats, x: number, y: number, container: Container) {
        this.stats = stats;
        this.x = x;
        this.y = y;
        this.sprite = new Sprite(projectileTextures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
        this.container = container;
    }

    // Moves then checks for collisions, returns true if anything is hit.
    update = (ui: Ui, enemies: DestructableMap<number, Enemy>, towerMap: TowerMap, particleSpawner: ParticleSpawner, network: Network, deltaTime: number): boolean => {
        if (this.x > towerMap.width * towerMap.tileSize) {
            return true;
        }

        this.move(deltaTime);

        const lane = Math.floor(this.y / towerMap.tileSize);

        for (let [id, enemy] of enemies) {
            const enemyLane = Math.floor(enemy.getY() / towerMap.tileSize);

            if (enemyLane != lane) {
                continue;
            }

            const enemyX = enemy.getX();

            if (this.x + towerMap.tileSize < enemyX || this.x > enemyX + towerMap.tileSize) {
                continue;
            }

            // Remove the enemy if it died.
            if (enemy.takeDamage(this.stats.damage)) {
                ui.bank.addMoney(enemy.stats.value);
                enemies.delete(id, particleSpawner);
                network.syncRemoveEnemy(id);
            }

            return true;
        }

        return false;
    }

    move = (deltaTime: number) => {
        this.x += this.stats.speed * deltaTime;
        this.sprite.x = this.x;
    }

    destroy = (particleSpawner: ParticleSpawner) => {
        particleSpawner.queue(this.x, this.y, ParticleStats.smoke);
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