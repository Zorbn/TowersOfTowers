import { Rectangle, SCALE_MODES, Texture } from "pixi.js";
import towerStatsData from "./towers.json";
import enemyStatsData from "./enemies.json";

const TEXTURE_SHEET_PADDING = 1;
const TEXTURE_TILE_SIZE = 16;

export const loadTextureSheet = async (path: string, tileSize: number, tileCount: number): Promise<Texture[]> => {
    const sheet = await Texture.fromURL(path);
    const paddedTileSize = tileSize + TEXTURE_SHEET_PADDING * 2;
    const sheetWidth = Math.floor(sheet.baseTexture.width / paddedTileSize);
    sheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    let textures = new Array(tileCount);
    for (let i = 0; i < tileCount; i++) {
        const x = TEXTURE_SHEET_PADDING + paddedTileSize * (i % sheetWidth);
        const y = TEXTURE_SHEET_PADDING + paddedTileSize * Math.floor(i / sheetWidth);
        textures[i] = new Texture(sheet.baseTexture, new Rectangle(x, y, tileSize, tileSize));
    }

    return textures;
}

// The maximum number of entries used from each of these texture sheets
// can't exceed the number of entries related to them in their respective
// data files, so we know their max texture count automatically.
export const towerTextures = await loadTextureSheet("towerSheet.png", TEXTURE_TILE_SIZE, towerStatsData.length);
export const enemyTextures = await loadTextureSheet("enemySheet.png", TEXTURE_TILE_SIZE, enemyStatsData.length);
export const projectileTextures = await loadTextureSheet("projectileSheet.png", TEXTURE_TILE_SIZE, towerStatsData.length);

export const tileTextures = await loadTextureSheet("tileSheet.png", TEXTURE_TILE_SIZE, 4);
export const particleTextures = await loadTextureSheet("particleSheet.png", TEXTURE_TILE_SIZE, 18);

export const uiTextures = await loadTextureSheet("uiSheet.png", TEXTURE_TILE_SIZE, 15);
export const namedUiTextures = {
    slotBackground: uiTextures[0],
    slotSelected: uiTextures[1],
    tabInventory: uiTextures[2],
    tabShop: uiTextures[3],
    tabSelected: uiTextures[1],
    buyButton: uiTextures[4],
    startButton: uiTextures[5],
    buttonSelected: uiTextures[1],
    downloadButton: uiTextures[6],
    uploadButton: uiTextures[7],
    saveButton: uiTextures[8],
    networkButton: uiTextures[9],
    disconnectButton: uiTextures[14],
    connectButton: uiTextures[10],
    inputFieldLeft: uiTextures[11],
    inputFieldMiddle: uiTextures[12],
    inputFieldRight: uiTextures[13],
};