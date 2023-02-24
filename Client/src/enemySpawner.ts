import { Enemy, EnemyStats } from "./enemy";
import enemyStatsData from "./enemies.json";
import { TowerMap } from "./towerMap";
import { Container } from "pixi.js";
import { Network } from "./network";

const ENEMY_SPAWN_WIDTH = 2;
const ENEMY_WAVE_LENGTH = 30;
const WAVES_PER_TIER = 1;

export class EnemySpawner {
    private wave: number;
    private spawnTime: number;
    private spawnTimer: number;
    private waveTimer: number;
    private active: boolean;
    private readonly enemyStatTiers: EnemyStats[][];

    constructor(wave: number = 1, active: boolean = false) {
        this.wave = wave;
        this.spawnTime = EnemySpawner.getSpawnTime(wave);
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.active = active;
        this.enemyStatTiers = EnemySpawner.loadEnemyStatTiers();
    }

    private static loadEnemyStatTiers = (): EnemyStats[][] => {
        let enemyStatTiers: EnemyStats[][] = [];

        for (let i = 0; i < EnemyStats.loadedEnemyStats.length; i++) {
            // Tier 1 is stored at index 0, and so on.
            const tier = enemyStatsData[i].tier - 1;

            if (tier < 0) {
                throw new Error("Failed to load enemy stats, invalid tier");
            }

            while (enemyStatTiers.length <= tier) {
                enemyStatTiers.push([]);
            }

            enemyStatTiers[tier].push(EnemyStats.loadedEnemyStats[i]);
        }

        return enemyStatTiers;
    }

    reset = () => {
        this.setWave(1);
        this.active = false;
    }

    isActive = (): boolean => {
        return this.active;
    }

    start = () => {
        this.active = true;
    }

    setWave = (newWave: number) => {
        this.wave = newWave;
        this.spawnTime = EnemySpawner.getSpawnTime(newWave);
        this.spawnTimer = 0;
        this.waveTimer = 0;
    }

    getWave = (): number => {
        return this.wave;
    }

    updateWave = (network: Network, deltaTime: number) => {
        this.waveTimer += deltaTime;

        if (this.waveTimer < ENEMY_WAVE_LENGTH) {
            return;
        }

        this.setWave(this.wave + 1);
        network.syncWave(this.wave, this.active);
    }

    updateSpawn = (enemies: Map<number, Enemy>, towerMap: TowerMap, container: Container, network: Network, deltaTime: number) => {
        this.spawnTimer += deltaTime;

        if (this.spawnTimer < this.spawnTime) {
            return;
        }

        this.spawnTimer = 0;

        // Select a random tier to spawn an enemy from. The maximum tier depends on the current wave.
        const enemyTier = Math.floor(Math.random() * this.enemyStatTiers.length) % (this.wave / WAVES_PER_TIER);
        const statsI = Math.floor(Math.random() * this.enemyStatTiers[enemyTier].length);
        const stats = this.enemyStatTiers[enemyTier][statsI];

        const x = (towerMap.width + Math.random() * ENEMY_SPAWN_WIDTH) * towerMap.tileSize;
        const lane = Math.floor(Math.random() * towerMap.height);

        const enemyId = Enemy.getNextId();
        const enemy = new Enemy(stats, x, lane, towerMap.tileSize, container, true);
        enemies.set(enemyId, enemy);
        network.syncSpawnEnemy(enemyId, enemy);
    }

    update = (enemies: Map<number, Enemy>, towerMap: TowerMap, container: Container, network: Network, deltaTime: number) => {
        if (!this.active) {
            return;
        }

        this.updateWave(network, deltaTime);
        this.updateSpawn(enemies, towerMap, container, network, deltaTime);
    }

    private static getSpawnTime = (wave: number): number => {
        return Math.max(5 - Math.log10(wave * 2 + 1), 1);
    }
}