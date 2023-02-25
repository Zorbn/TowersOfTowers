import { Container } from "pixi.js";
import { IDamageable } from "./damageable";
import { Network } from "./network";
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
    public readonly index: number;

    constructor(name: string, textureIndex: number, projectileStats: ProjectileStats | null, attackTime: number, health: number, index: number, empty: boolean = false) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.projectileStats = projectileStats;
        this.attackTime = attackTime;
        this.health = health;
        this.empty = empty;
        this.index = index;
    }

    private static loadTowerStats = (): TowerStats[] => {
        let towerStats: TowerStats[] = [];

        for (let data of towerStatsData) {
            const index = towerStats.length;
            towerStats.push(new TowerStats(
                data.name,
                data.textureIndex,
                new ProjectileStats(
                    data.projectileStats.textureIndex,
                    data.projectileStats.damage,
                    data.projectileStats.speed,
                    index,
                ),
                data.attackTime,
                data.health,
                index,
            ));
        }

        return towerStats;
    }

    public static readonly empty = new TowerStats("Empty", -1, null, 0, 0, -1, true);
    public static readonly loadedTowerStats = this.loadTowerStats();
}

const ALWAYS_LOCAL_ID: string = "";

export class Tower implements IDamageable {
    public readonly stats: TowerStats;
    public readonly ownerId: string;
    private attackTimer: number;
    private health: number;

    constructor(stats: TowerStats, ownerId: string) {
        this.stats = stats;
        this.ownerId = ownerId;
        this.health = stats.health;
        this.attackTimer = 0;
    }

    update = (tileX: number, tileY: number, tileSize: number, projectiles: Map<number, Projectile>, projectileContainer: Container, network: Network, deltaTime: number) => {
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
        const projectileId = Projectile.getNextId();
        const projectile = new Projectile(this.stats.projectileStats, x, y, projectileContainer);
        projectiles.set(projectileId, projectile);
        network.syncSpawnProjectile(projectileId, projectile);
    }

    takeDamage = (damage: number, _particleSpawner: ParticleSpawner): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            return true;
        }

        return false;
    }

    isLocallyOwned = (localId: string) => {
        return this.ownerId == ALWAYS_LOCAL_ID || this.ownerId == localId;
    }

    public static readonly empty = new Tower(TowerStats.empty, ALWAYS_LOCAL_ID);
}