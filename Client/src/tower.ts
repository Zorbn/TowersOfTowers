import { IDamageable } from "./damageable";
import { Projectile, ProjectileStats } from "./projectile";
import { State } from "./state";
import towerStatsData from "./towers.json";

export class TowerStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly projectileStats: ProjectileStats | null;
    public readonly attackTime: number;
    public readonly health: number;
    public readonly empty: boolean;

    constructor(name: string, textureIndex: number, projectileStats: ProjectileStats | null, attackTime: number, health: number, empty: boolean = false) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.projectileStats = projectileStats;
        this.attackTime = attackTime;
        this.health = health;
        this.empty = empty;
    }

    private static loadTowerStats = (): TowerStats[] => {
        let towerStats = [];

        for (let data of towerStatsData) {
            towerStats.push(new TowerStats(
                data.name,
                data.textureIndex,
                new ProjectileStats(
                    data.projectileStats.textureIndex,
                    data.projectileStats.damage,
                    data.projectileStats.speed,
                ),
                data.attackTime,
                data.health,
            ));
        }

        return towerStats;
    }

    public static readonly empty = new TowerStats("Empty", -1, null, 0, 0, true);
    public static readonly loadedTowerStats = this.loadTowerStats();
}

export class Tower implements IDamageable {
    public readonly stats: TowerStats;
    private attackTimer: number;
    private health: number;

    constructor(stats: TowerStats) {
        this.stats = stats;
        this.health = stats.health;
        this.attackTimer = 0;
    }

    update = (tileX: number, tileY: number, tileSize: number, state: State, deltaTime: number) => {
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
        state.projectiles.push(new Projectile(this.stats.projectileStats, x, y,
            state.projectileTextures, state.entitySpriteContainer));
    }

    takeDamage = (damage: number, _state: State): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            return true;
        }

        return false;
    }

    public static readonly empty = new Tower(TowerStats.empty);
}