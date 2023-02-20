import { Container, Sprite, Texture } from "pixi.js";
import { Enemy } from "./enemy";
import { EnemySpawner } from "./enemySpawner";
import { Input } from "./input";
import { TowerMap } from "./towerMap";
import { Ui } from "./ui";

export type State = {
    view: Container,
    scaledView: Container,
    input: Input,
    ui: Ui,
    towerTextures: Texture[],
    towerSprites: Sprite[],
    entitySpriteContainer: Container,
    enemies: Enemy[],
    enemyTextures: Texture[],
    enemySpawner: EnemySpawner,
    map: TowerMap,
}