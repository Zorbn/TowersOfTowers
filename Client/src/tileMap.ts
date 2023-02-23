import { Container, Sprite } from "pixi.js";
import { tileTextures } from "./textureSheet";

export class TileMap {
    private tileSprites: Sprite[];
    public readonly width: number;
    public readonly height: number;
    public readonly tileSize: number;

    constructor(width: number, height: number, tileSize: number, container: Container) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tileSprites = new Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = this.getDefaultTileStyle(x, y);
                const newTile = new Sprite(tileTextures[i]);
                newTile.x = x * tileSize;
                newTile.y = y * tileSize;
                this.tileSprites[x + y * width] = newTile;
                container.addChild(newTile);
            }
        }
    }

    updateTileStyle = (tileX: number, tileY: number, empty: boolean) => {
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        let textureIndex = 3;

        if (empty) {
            textureIndex = this.getDefaultTileStyle(tileX, tileY);
        }

        this.tileSprites[tileX + tileY * this.width].texture = tileTextures[textureIndex];
    }

    getDefaultTileStyle = (tileX: number, tileY: number) => {
        return (tileX + tileY * this.width) % 2;
    }
}