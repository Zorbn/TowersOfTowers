import { Container } from "pixi.js";
import { DestructableMap } from "./entities/destructable";
import { Enemy } from "./entities/enemy";
import { EnemySpawner } from "./entities/enemySpawner";
import { Input } from "./input";
import { Network } from "./network";
import { Particle } from "./entities/particle";
import { ParticleSpawner } from "./entities/particleSpawner";
import { Projectile } from "./entities/projectile";
import { TileMap } from "./map/tileMap";
import { TowerMap } from "./map/towerMap";
import { Ui } from "./interface/ui";

export type World = {
    view: Container,
    entitySpriteContainer: Container,
    input: Input,
    ui: Ui,
    network: Network,
    enemies: DestructableMap<number, Enemy>,
    enemySpawner: EnemySpawner,
    towerMap: TowerMap,
    tileMap: TileMap,
    projectiles: DestructableMap<number, Projectile>,
    particleSpawner: ParticleSpawner,
    particles: Particle[],
}