import { Container } from "pixi.js";
import { DestructableMap } from "./destructable";
import { Enemy } from "./enemy";
import { EnemySpawner } from "./enemySpawner";
import { Input } from "./input";
import { Network } from "./network";
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
    network: Network,
    enemies: DestructableMap<number, Enemy>,
    enemySpawner: EnemySpawner,
    towerMap: TowerMap,
    tileMap: TileMap,
    projectiles: DestructableMap<number, Projectile>,
    particleSpawner: ParticleSpawner,
    particles: Particle[],
}