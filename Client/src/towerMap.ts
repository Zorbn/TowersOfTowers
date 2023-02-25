import { Container, Sprite } from "pixi.js";
import { Tower, TowerStats } from "./tower";
import { ParticleStats } from "./particle";
import { towerTextures } from "./textureSheet";
import { TileMap } from "./tileMap";
import { Ui } from "./ui";
import { ParticleSpawner } from "./particleSpawner";
import { Projectile } from "./projectile";
import { Network } from "./network";
import { DestructableMap } from "./destructable";

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

    setTower = (x: number, y: number, tower: Tower, tileMap: TileMap, particleSpawner: ParticleSpawner) => {
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

        tileMap.updateTileStyle(x, y, tower.stats.empty);
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

    update = (projectiles: DestructableMap<number, Projectile>, projectileContainer: Container,
        particleSpawner: ParticleSpawner, network: Network, deltaTime: number) => {

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = x + y * this.width;
                this.towers[i].update(x, y, this.tileSize, projectiles,
                    projectileContainer, particleSpawner, network, deltaTime);
            }
        }
    }

    tryPlaceTower = (x: number, y: number, tileMap: TileMap, ui: Ui,
        particleSpawner: ParticleSpawner, network: Network) => {

        const oldTower = this.getTower(x, y);

        if (!oldTower.isLocallyOwned(network.getLocalId())) {
            return;
        }

        if (!oldTower.stats.empty) {
            if (network.isInControl()) {
                ui.inventory.stopUsingTower(oldTower.stats, 1);
                this.setTower(x, y, Tower.empty, tileMap, particleSpawner);
                network.syncRemoveTower(x, y);
            } else {
                network.requestRemoveTower(x, y);
            }

            return;
        }

        const selectedSlot = ui.getSelectedItem();

        if (selectedSlot.towerStats.empty || !this.contains(x, y) ||
            !ui.inventory.startUsingTower(selectedSlot.towerStats, 1)) {
            return;
        }

        const newTowerStats = selectedSlot.towerStats;
        if (network.isInControl()) {
            this.setTower(x, y, new Tower(newTowerStats, network.getLocalId()), tileMap, particleSpawner);
            network.syncPlaceTower(x, y, newTowerStats.index);
        } else {
            network.requestPlaceTower(x, y, newTowerStats.index);
        }
    }
}