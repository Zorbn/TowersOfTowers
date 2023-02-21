import { Container, Sprite, Texture } from "pixi.js";
import { State } from "./state";

export class ProjectileStats {
    public readonly textureIndex: number;
    public readonly damage: number;
    public readonly speed: number;

    constructor(textureIndex: number, damage: number, speed: number) {
        this.textureIndex = textureIndex;
        this.damage = damage;
        this.speed = speed;
    }
}

export class Projectile {
    public readonly stats: ProjectileStats;
    private x: number;
    private y: number;
    private sprite: Sprite;
    private container: Container;

    constructor(stats: ProjectileStats, x: number, y: number, textures: Texture[], container: Container) {
        this.stats = stats;
        this.x = x;
        this.y = y;
        this.sprite = new Sprite(textures[stats.textureIndex]);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        container.addChild(this.sprite);
        this.container = container;
    }

    // Moves then checks for collisions, returns true if anything is hit.
    update = (tileSize: number, state: State, deltaTime: number): boolean => {
        if (this.x > state.map.width * tileSize) {
            return true;
        }

        const lane = Math.floor(this.y / tileSize);
        this.x += this.stats.speed * deltaTime;
        this.sprite.x = this.x;

        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            const enemyLane = Math.floor(enemy.getY() / tileSize);

            if (enemyLane != lane) {
                continue;
            }

            const enemyX = enemy.getX();

            if (this.x + tileSize < enemyX || this.x > enemyX + tileSize) {
                continue;
            }

            // Remove the enemy if it died.
            if (enemy.takeDamage(this.stats.damage)) {
                state.ui.bank.addMoney(enemy.stats.value);
                state.enemies.splice(i, 1);
            }

            return true;
        }

        return false;
    }

    destroy = () => {
        this.container.removeChild(this.sprite);
    }
}