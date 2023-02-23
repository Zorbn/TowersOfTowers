import { Container, Sprite } from "pixi.js";
import { Tower, TowerStats } from "./tower";
import { World } from "./world";
import { ParticleStats } from "./particle";
import { towerTextures } from "./textureSheet";
import { TileMap } from "./tileMap";
import { Ui } from "./ui";
import { ParticleSpawner } from "./particleSpawner";
import { Projectile } from "./projectile";

export class TowerMap {
    private towers: Tower[];
    private towerSprites: Sprite[];
    public readonly width: number;
    public readonly height: number;
    public readonly tileSize: number;

    constructor(width: number, height: number, tileSize: number, container: Container) {
        this.towers = new Array(width * height);
        this.towerSprites = new Array(this.towers.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = x + y * width;
                this.towerSprites[i] = new Sprite();
                this.towerSprites[i].x = x * tileSize;
                this.towerSprites[i].y = y * tileSize;
                container.addChild(this.towerSprites[i]);
            }
        }

        this.towers.fill(Tower.empty);
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
    }

    contains = (x: number, y: number): boolean => {
        x = Math.floor(x);
        y = Math.floor(y);

        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    setTower = (x: number, y: number, tower: Tower, particleSpawner: ParticleSpawner) => {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.contains(x, y)) {
            return;
        }

        const i = x + y * this.width;
        this.towers[i] = tower;
        const towerSprite = this.towerSprites[i];

        let particleStats;

        if (tower.stats.empty) {
            towerSprite.visible = false;
            particleStats = ParticleStats.cloud;
        } else {
            towerSprite.visible = true;
            towerSprite.texture = towerTextures[tower.stats.textureIndex];
            particleStats = ParticleStats.dust;
        }

        particleSpawner.queue(towerSprite.x, towerSprite.y, particleStats);
    }

    getTower = (x: number, y: number): Tower => {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.contains(x, y)) {
            return Tower.empty;
        }

        return this.towers[x + y * this.width];
    }

    getTowerStats = (x: number, y: number): TowerStats => {
        return this.getTower(x, y).stats;
    }

    update = (projectiles: Projectile[], projectileContainer: Container, deltaTime: number) => {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = x + y * this.width;
                this.towers[i].update(x, y, this.tileSize, projectiles, projectileContainer, deltaTime);
            }
        }
    }

    tryPlaceTower = (mouseTileX: number, mouseTileY: number, tileMap: TileMap, ui: Ui, particleSpawner: ParticleSpawner) => {
        const oldTowerStats = this.getTowerStats(mouseTileX, mouseTileY);

        if (!oldTowerStats.empty) {
            ui.inventory.stopUsingTower(oldTowerStats, 1);
            this.setTower(mouseTileX, mouseTileY, Tower.empty, particleSpawner);
            tileMap.updateTileStyle(mouseTileX, mouseTileY, true);
            return;
        }

        const selectedSlot = ui.getSelectedItem();

        if (selectedSlot.towerStats.empty || !this.contains(mouseTileX, mouseTileY) ||
            !ui.inventory.startUsingTower(selectedSlot.towerStats, 1)) {
            return;
        }

        const newTowerStats = selectedSlot.towerStats;
        tileMap.updateTileStyle(mouseTileX, mouseTileY, false);
        this.setTower(mouseTileX, mouseTileY, new Tower(newTowerStats), particleSpawner);
    }
}