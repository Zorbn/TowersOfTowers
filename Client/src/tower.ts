import { Container } from "pixi.js";
import { IDamageable } from "./damageable";
import { ParticleSpawner } from "./particleSpawner";
import { Projectile, ProjectileStats } from "./projectile";
import towerStatsData from "./towers.json";

export class TowerStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly projectileStats: ProjectileStats | null;
    public readonly attackTime: number;
    public readonly health: number;
    public readonly empty: boolean;
    public readonly loadIndex: number;

    constructor(name: string, textureIndex: number, projectileStats: ProjectileStats | null, attackTime: number, health: number, loadIndex: number, empty: boolean = false) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.projectileStats = projectileStats;
        this.attackTime = attackTime;
        this.health = health;
        this.empty = empty;
        this.loadIndex = loadIndex;
    }

    private static loadTowerStats = (): TowerStats[] => {
        let towerStats: TowerStats[] = [];

        for (let data of towerStatsData) {
            const loadIndex = towerStats.length;
            towerStats.push(new TowerStats(
                data.name,
                data.textureIndex,
                new ProjectileStats(
                    data.projectileStats.textureIndex,
                    data.projectileStats.damage,
                    data.projectileStats.speed,
                    loadIndex,
                ),
                data.attackTime,
                data.health,
                loadIndex,
            ));
        }

        return towerStats;
    }

    public static readonly empty = new TowerStats("Empty", -1, null, 0, 0, -1, true);
    public static readonly loadedTowerStats = this.loadTowerStats();
}

export class Tower implements IDamageable {
    public readonly stats: TowerStats;
    public readonly locallyOwned: boolean;
    private attackTimer: number;
    private health: number;

    constructor(stats: TowerStats, locallyOwned: boolean = true) {
        this.stats = stats;
        this.locallyOwned = locallyOwned;
        this.health = stats.health;
        this.attackTimer = 0;
    }

    update = (tileX: number, tileY: number, tileSize: number, projectiles: Projectile[], projectileContainer: Container, deltaTime: number) => {
        if (this.stats.projectileStats == null) {
            return;
        }

        this.attackTimer += deltaTime;

        if (this.attackTimer < this.stats.attackTime) {
            return;
        }

        this.attackTimer = 0;
        const x = (tileX + 0.5) * tileSize;
        const y = tileY * tileSize;
        projectiles.push(new Projectile(this.stats.projectileStats, x, y,
            projectileContainer));
    }

    takeDamage = (damage: number, _particleSpawner: ParticleSpawner): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            return true;
        }

        return false;
    }

    public static readonly empty = new Tower(TowerStats.empty);
}