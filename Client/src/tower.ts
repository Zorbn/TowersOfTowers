import { Projectile, ProjectileStats } from "./projectile";
import { State } from "./state";

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

    public static readonly empty = new TowerStats('Empty', -1, null, 0, 0, true);
    public static readonly singleShot = new TowerStats('Single Shot', 0, new ProjectileStats(0, 5, 50), 1, 100);
    public static readonly doubleShot = new TowerStats('Double Shot', 1, new ProjectileStats(1, 10, 50), 1, 200);
}

export class Tower {
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
        const x = tileX * tileSize;
        const y = tileY * tileSize;
        state.projectiles.push(new Projectile(this.stats.projectileStats, x, y,
            state.projectileTextures, state.entitySpriteContainer));
    }

    // TODO: Make IDamageable interface?
    // Returns true if the tower has died for taking damage.
    takeDamage = (damage: number): boolean => {
        this.health -= damage;

        if (this.health <= 0) {
            return true;
        }

        return false;
    }

    public static readonly empty = new Tower(TowerStats.empty);
}