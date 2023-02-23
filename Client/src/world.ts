import { Container } from "pixi.js";
import { Enemy } from "./enemy";
import { EnemySpawner } from "./enemySpawner";
import { Input } from "./input";
import { Particle } from "./particle";
import { ParticleSpawner } from "./particleSpawner";
import { Projectile } from "./projectile";
import { TileMap } from "./tileMap";
import { TowerMap } from "./towerMap";
import { Ui } from "./ui";

export type World = {
    view: Container,
    entitySpriteContainer: Container,
    input: Input,
    ui: Ui,
    enemies: Enemy[],
    enemySpawner: EnemySpawner,
    towerMap: TowerMap,
    tileMap: TileMap,
    projectiles: Projectile[],
    particleSpawner: ParticleSpawner,
    particles: Particle[],
}