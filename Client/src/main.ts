import { Application, Sprite, Container, Texture, Rectangle, SCALE_MODES, BitmapFont } from "pixi.js";
import { Tower } from "./tower";
import { Input } from "./input";
import { State } from "./state";
import { Ui } from "./ui";
import { EnemySpawner } from "./enemySpawner";
import { TowerMap } from "./towerMap";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 240;

const MAP_WIDTH = 15;
const MAP_HEIGHT = 4;
const TILE_SIZE = 16;
const BASE_WIDTH = 3;

// TODO:
// Particles, could be used for damage, spawning, destroying
// Animated enemies?
// Networking?

const onResize = (view: Container, scaledView: Container) => {
    let scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);

    scaledView.scale.x = scale;
    scaledView.scale.y = scale;

    view.x = window.innerWidth / 2 - (VIEW_WIDTH * scale) / 2;
    view.y = window.innerHeight / 2 - (VIEW_HEIGHT * scale) / 2;
}

const loadTextureSheet = (path: string, tileSize: number, tileCount: number): Texture[] => {
    const sheet = Texture.from(path);
    sheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    let textures = new Array(tileCount);
    for (let i = 0; i < tileCount; i++) {
        textures[i] = new Texture(sheet.baseTexture, new Rectangle(tileSize * i, 0, tileSize, tileSize));
    }

    return textures;
}

const getDefaultTileStyle = (state: State, tileX: number, tileY: number) => {
    return (tileX + tileY * state.map.width) % 2;
}

const updateTileStyle = (state: State, tileX: number, tileY: number, empty: boolean) => {
    tileX = Math.floor(tileX);
    tileY = Math.floor(tileY);

    let textureIndex = 3;

    if (empty) {
        textureIndex = getDefaultTileStyle(state, tileX, tileY);
    }

    state.tileSprites[tileX + tileY * state.map.width].texture = state.tileTextures[textureIndex];
}

const tryPlaceTower = (state: State, mouseTileX: number, mouseTileY: number) => {
    const oldTowerStats = state.map.getTowerStats(mouseTileX, mouseTileY);

    if (!oldTowerStats.empty) {
        state.ui.inventory.stopUsingTower(oldTowerStats, 1);
        state.map.setTower(state, mouseTileX, mouseTileY, Tower.empty);
        updateTileStyle(state, mouseTileX, mouseTileY, true);
        return;
    }

    const selectedSlot = state.ui.getSelectedItem();

    if (selectedSlot.towerStats.empty || !state.map.contains(mouseTileX, mouseTileY) ||
        !state.ui.inventory.startUsingTower(selectedSlot.towerStats, 1)) {
        return;
    }

    const newTowerStats = selectedSlot.towerStats;
    updateTileStyle(state, mouseTileX, mouseTileY, false);
    state.map.setTower(state, mouseTileX, mouseTileY, new Tower(newTowerStats));
}

const updateEnemies = (state: State, deltaTime: number) => {
    state.enemySpawner.update(state, deltaTime);

    let enemyInPlayerBase = false;

    for (let enemy of state.enemies) {
        enemy.update(deltaTime, state);

        // Check if the enemy has reached the player's base.
        if (enemy.getX() < -TILE_SIZE) {
            enemyInPlayerBase = true;
            break;
        }
    }

    if (enemyInPlayerBase) {
        for (let enemy of state.enemies) {
            enemy.destroy();
        }

        state.enemies.splice(0, state.enemies.length);
        state.enemySpawner.reset();
    }
}

const update = async (state: State, deltaTime: number) => {
    state.ui.draw(state, TILE_SIZE);

    // TODO: Remove this.
    if (state.input.wasKeyPressed("KeyM")) {
        state.ui.bank.addMoney(25);
    }

    if (state.input.wasMouseButtonPressed(0)) {
        const mouseX = state.input.getMouseX();
        const mouseY = state.input.getMouseY();
        const mouseWorldX = state.input.getMouseWorldX(state);
        const mouseWorldY = state.input.getMouseWorldY(state);
        const mouseTileX = (mouseWorldX - state.entitySpriteContainer.x) / TILE_SIZE;
        const mouseTileY = (mouseWorldY - state.entitySpriteContainer.y) / TILE_SIZE;

        state.ui.interact(mouseWorldX, mouseWorldY, mouseX, mouseY, state);

        tryPlaceTower(state, mouseTileX, mouseTileY);
    }

    updateEnemies(state, deltaTime);

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const projectile = state.projectiles[i];

        // Remove the projectile if it had a collision.
        if (projectile.update(TILE_SIZE, state, deltaTime)) {
            projectile.destroy();
            state.projectiles.splice(i, 1);
        }
    }

    state.map.update(state, deltaTime);

    state.input.update();
}

const main = async () => {
    const app = new Application({
        resizeTo: window,
        autoDensity: true,
    });

    BitmapFont.from("DefaultFont", {
        fontFamily: "Oswald",
        fontSize: 64,
        fill: "white",
    }, {
        chars: BitmapFont.ASCII,
    });

    document.body.appendChild(app.view as HTMLCanvasElement);

    const view = new Container();
    const scaledView = new Container();
    view.addChild(scaledView);
    scaledView.sortableChildren = true;
    app.stage.addChild(view);

    const tileTextures = loadTextureSheet("tileSheet.png", TILE_SIZE, 4);
    const towerTextures = loadTextureSheet("towerSheet.png", TILE_SIZE, 3);
    const uiTextures = loadTextureSheet("uiSheet.png", TILE_SIZE, 9);
    const enemyTextures = loadTextureSheet("enemySheet.png", TILE_SIZE, 2);
    const projectileTextures = loadTextureSheet("projectileSheet.png", TILE_SIZE, 4);

    const background = new Container();
    background.zIndex = -1;
    background.x = VIEW_WIDTH * 0.5 - MAP_WIDTH * TILE_SIZE * 0.5;
    background.y = VIEW_HEIGHT * 0.5 - MAP_HEIGHT * TILE_SIZE * 0.5 + TILE_SIZE * 4;

    const playerBaseTexture = Texture.from("playerBase.png");
    playerBaseTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    const playerBaseSprite = new Sprite(playerBaseTexture);
    playerBaseSprite.anchor.x = 1.0;
    playerBaseSprite.anchor.y = 1.0;
    playerBaseSprite.y = MAP_HEIGHT * TILE_SIZE;
    background.addChild(playerBaseSprite);

    const enemyBaseTexture = Texture.from("enemyBase.png");
    enemyBaseTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    const enemyBaseSprite = new Sprite(enemyBaseTexture);
    enemyBaseSprite.anchor.y = 1.0;
    enemyBaseSprite.x = MAP_WIDTH * TILE_SIZE;
    enemyBaseSprite.y = MAP_HEIGHT * TILE_SIZE;
    background.addChild(enemyBaseSprite);

    let state: State = {
        view,
        scaledView,
        input: new Input(),
        ui: new Ui(TILE_SIZE, 9, 3,
            VIEW_WIDTH, VIEW_HEIGHT, {
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
        }, scaledView),
        projectileTextures,
        towerTextures,
        towerSprites: new Array(MAP_WIDTH * MAP_HEIGHT),
        entitySpriteContainer: new Container(),
        enemyTextures,
        enemies: [],
        enemySpawner: new EnemySpawner(),
        map: new TowerMap(MAP_WIDTH, MAP_HEIGHT, TILE_SIZE),
        projectiles: [],
        tileSprites: [],
        tileTextures,
    };

    state.input.addListeners();

    state.entitySpriteContainer.x = background.x;
    state.entitySpriteContainer.y = background.y;
    scaledView.addChild(state.entitySpriteContainer);

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const i = getDefaultTileStyle(state, x, y);
            const newTile = new Sprite(tileTextures[i]);
            newTile.x = x * TILE_SIZE;
            newTile.y = y * TILE_SIZE;
            state.tileSprites[x + y * MAP_WIDTH] = newTile;
            background.addChild(newTile);
        }
    }

    for (let x = -BASE_WIDTH; x < MAP_WIDTH + BASE_WIDTH; x++) {
        const edgeTile = new Sprite(tileTextures[2]);
        edgeTile.x = x * TILE_SIZE;
        edgeTile.y = MAP_HEIGHT * TILE_SIZE;
        background.addChild(edgeTile);
    }

    scaledView.addChild(background);

    onResize(view, scaledView);

    window.addEventListener("resize", () => onResize(view, scaledView));

    app.ticker.add(() => update(state, app.ticker.deltaMS * 0.001));
}

main();