import { Container, Sprite } from "pixi.js";
import { IDestructable } from "./destructable";
import { Enemy } from "./enemy";
import { ParticleStats } from "./particle";
import { ParticleSpawner } from "./particleSpawner";
import { projectileTextures } from "./textureSheet";
import { TowerMap } from "./towerMap";
import { Ui } from "./ui";

export class ProjectileStats {
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly speed: number;
    public readonly towerLoadIndex: number;

    constructor(textureIndex: number, damage: number, speed: number, towerLoadIndex: number) {
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.speed = speed;
        this.towerLoadIndex = towerLoadIndex;
    }
}

export class Projectile implements IDestructable {
    public readonly stats: ProjectileStats;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private container: Container;

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
    update = (ui: Ui, enemies: Enemy[], towerMap: TowerMap, particleSpawner: ParticleSpawner, deltaTime: number): boolean => {
        if (this.x > towerMap.width * towerMap.tileSize) {
            return true;
        }

        const lane = Math.floor(this.y / towerMap.tileSize);
        this.x += this.stats.speed * deltaTime;
        this.sprite.x = this.x;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const enemyLane = Math.floor(enemy.getY() / towerMap.tileSize);

            if (enemyLane != lane) {
                continue;
            }

            const enemyX = enemy.getX();

            if (this.x + towerMap.tileSize < enemyX || this.x > enemyX + towerMap.tileSize) {
                continue;
            }

            // Remove the enemy if it died.
            if (enemy.takeDamage(this.stats.damage, particleSpawner)) {
                ui.bank.addMoney(enemy.stats.value);
                enemies.splice(i, 1);
            }

            return true;
        }

        return false;
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
}