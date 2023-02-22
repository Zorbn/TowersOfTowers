import { Container, Sprite, Texture } from "pixi.js";
import { Enemy } from "./enemy";
import { EnemySpawner } from "./enemySpawner";
import { Input } from "./input";
import { Particle } from "./particle";
import { Projectile } from "./projectile";
import { TowerMap } from "./towerMap";
import { Ui } from "./ui";

export type State = {
    view: Container,
    scaledView: Container,
    entitySpriteContainer: Container,
    towerTextures: Texture[],
    enemyTextures: Texture[],
    projectileTextures: Texture[],
    particleTextures: Texture[],
    tileTextures: Texture[],
    input: Input,
    ui: Ui,
    towerSprites: Sprite[],
    tileSprites: Sprite[],
    enemies: Enemy[],
    enemySpawner: EnemySpawner,
    map: TowerMap,
    projectiles: Projectile[],
    particles: Particle[],
}