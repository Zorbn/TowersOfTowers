import { Projectile, ProjectileStats } from "./projectile";
import { State } from "./state";

export class TowerStats {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly projectileStats: ProjectileStats | null;
    public readonly attackTime: number;
    public readonly empty: boolean;

    constructor(name: string, textureIndex: number, projectileStats: ProjectileStats | null, attackTime: number, empty: boolean = false) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.projectileStats = projectileStats;
        this.attackTime = attackTime;
        this.empty = empty;
    }

    public static readonly empty = new TowerStats('Empty', -1, null, 0, true);
    public static readonly singleShot = new TowerStats('Single Shot', 0, new ProjectileStats(0, 5, 50), 1);
    public static readonly doubleShot = new TowerStats('Double Shot', 1, new ProjectileStats(1, 10, 50), 1);
}

export class Tower {
    public readonly stats: TowerStats;
    private attackTimer: number;

    constructor(stats: TowerStats) {
        this.stats = stats;
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
        const x = tileX * tileSize;
        const y = tileY * tileSize;
        state.projectiles.push(new Projectile(this.stats.projectileStats, x, y,
            state.projectileTextures, state.entitySpriteContainer));
    }

    public static readonly empty = new Tower(TowerStats.empty);
}