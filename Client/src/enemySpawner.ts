import { Container, Texture } from "pixi.js";
import { Enemy, EnemyStats } from "./enemy";

const ENEMY_SPAWN_WIDTH = 2;

export class EnemySpawner {
    private spawnLevel: number;
    private spawnTime: number;
    private spawnTimer: number;
    private active: boolean;

    private static readonly allEnemyStats = [
        EnemyStats.zombie,
        EnemyStats.speedyZombie,
    ];

    constructor(spawnLevel: number = 1, active: boolean = false) {
        this.spawnLevel = spawnLevel;
        this.spawnTime = EnemySpawner.getSpawnTime(spawnLevel);
        this.spawnTimer = 0;
        this.active = active;
    }

    reset = () => {
        this.spawnLevel = 1;
        this.spawnTime = EnemySpawner.getSpawnTime(this.spawnLevel);
        this.spawnTimer = 0;
        this.active = false;
    }

    isActive = (): boolean => {
        return this.active;
    }

    start = () => {
        this.active = true;
    }

    update = (enemies: Enemy[], deltaTime: number, mapWidth: number, mapHeight: number,
        tileSize: number, enemyTextures: Texture[], container: Container) => {
        if (!this.active) {
            return;
        }

        this.spawnTimer += deltaTime;

        if (this.spawnTimer < this.spawnTime) {
            return;
        }

        this.spawnTimer = 0;

        const statsI = Math.floor(Math.random() * EnemySpawner.allEnemyStats.length);
        const stats = EnemySpawner.allEnemyStats[statsI];
        const x = (mapWidth + Math.random() * ENEMY_SPAWN_WIDTH) * tileSize;
        const lane = Math.floor(Math.random() * mapHeight);

        enemies.push(new Enemy(stats, x, lane, tileSize, enemyTextures, container));
    }

    private static getSpawnTime = (spawnLevel: number): number => {
        return spawnLevel * 5;
    }
}