import { Sprite } from "pixi.js";
import { Tower, TowerStats } from "./tower";
import { State } from "./state";

export class TowerMap {
    private towers: Tower[];
    public readonly width: number;
    public readonly height: number;
    public readonly tileSize: number;

    constructor(width: number, height: number, tileSize: number) {
        this.towers = new Array(width * height);
        this.towers.fill(Tower.empty);
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
    }

    // TODO: Don't create/delete new sprites, create sprites on init then
    // change their textures like the UI does.
    contains = (x: number, y: number): boolean => {
        x = Math.floor(x);
        y = Math.floor(y);

        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    setTower = (state: State, x: number, y: number, tower: Tower) => {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.contains(x, y)) {
            return;
        }

        const i = x + y * this.width;

        const oldTower = this.getTowerStats(x, y);
        if (!oldTower.empty && state.towerSprites[i] != null) {
            state.entitySpriteContainer.removeChild(state.towerSprites[i])
        }

        this.towers[i] = tower;
        const towerSprite = new Sprite(state.towerTextures[tower.stats.textureIndex]);
        towerSprite.x = x * this.tileSize;
        towerSprite.y = y * this.tileSize;
        state.entitySpriteContainer.addChild(towerSprite);
        state.towerSprites[i] = towerSprite;
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

    update = (state: State, deltaTime: number) => {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = x + y * this.width;
                this.towers[i].update(x, y, this.tileSize, state, deltaTime);
            }
        }
    }
}