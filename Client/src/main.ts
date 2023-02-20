import { Application, Sprite, Container, Texture, Rectangle, SCALE_MODES, BitmapFont } from 'pixi.js';
import { Tower } from './tower';
import { Input } from './input';
import { State } from './state';
import { Ui } from './ui';
import { EnemySpawner } from './enemySpawner';
import { TowerMap } from './towerMap';

const VIRTUAL_WIDTH = 320;
const VIRTUAL_HEIGHT = 240;

const MAP_WIDTH = 15;
const MAP_HEIGHT = 4;
const TILE_SIZE = 16;

// TODO:
// Scene support
// Particles, could be used for damage, spawning, destroying
// Animated enemies?

const onResize = (view: Container, scaledView: Container) => {
    let scale = Math.min(window.innerWidth / VIRTUAL_WIDTH, window.innerHeight / VIRTUAL_HEIGHT);

    scaledView.scale.x = scale;
    scaledView.scale.y = scale;

    view.x = window.innerWidth / 2 - (VIRTUAL_WIDTH * scale) / 2;
    view.y = window.innerHeight / 2 - (VIRTUAL_HEIGHT * scale) / 2;
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

const tryPlaceTower = (state: State, mouseTileX: number, mouseTileY: number) => {
    const oldTower = state.map.getTowerStats(mouseTileX, mouseTileY);

    if (!oldTower.empty) {
        state.ui.inventory.stopUsingTower(oldTower, 1);
        state.map.setTower(state, mouseTileX, mouseTileY, Tower.empty);
        return;
    }

    const selectedSlot = state.ui.getSelectedItem();

    if (selectedSlot.towerStats.empty || !state.map.contains(mouseTileX, mouseTileY) ||
        !state.ui.inventory.startUsingTower(selectedSlot.towerStats, 1)) {
        return;
    }

    state.map.setTower(state, mouseTileX, mouseTileY, new Tower(selectedSlot.towerStats));
}

const update = async (state: State, deltaTime: number) => {
    state.ui.draw(state.towerTextures, TILE_SIZE);

    if (state.input.wasKeyPressed('KeyM')) {
        state.ui.addMoney(25);
    }

    if (state.input.wasMouseButtonPressed(0)) {
        const mouseX = state.input.getMouseX();
        const mouseY = state.input.getMouseY();
        const mouseWorldX = state.input.getMouseWorldX(state);
        const mouseWorldY = state.input.getMouseWorldY(state);
        const mouseTileX = (mouseWorldX - state.entitySpriteContainer.x) / TILE_SIZE;
        const mouseTileY = (mouseWorldY - state.entitySpriteContainer.y) / TILE_SIZE;

        state.ui.interact(mouseWorldX, mouseWorldY, mouseX, mouseY, TILE_SIZE);

        tryPlaceTower(state, mouseTileX, mouseTileY);
    }

    state.enemySpawner.update(state.enemies, deltaTime, MAP_WIDTH, MAP_HEIGHT,
        TILE_SIZE, state.enemyTextures, state.entitySpriteContainer);

    for (let enemy of state.enemies) {
        enemy.update(deltaTime, state);
    }

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

    BitmapFont.from('DefaultFont', {
        fontFamily: 'Oswald',
        fontSize: 64,
        fill: 'white',
    }, {
        chars: BitmapFont.ASCII,
    });

    document.body.appendChild(app.view as HTMLCanvasElement);

    const view = new Container();
    const scaledView = new Container();
    view.addChild(scaledView);
    scaledView.sortableChildren = true;
    app.stage.addChild(view);

    const tileTextures = loadTextureSheet('tileSheet.png', TILE_SIZE, 2);
    const towerTextures = loadTextureSheet('towerSheet.png', TILE_SIZE, 2);
    const uiTextures = loadTextureSheet('uiSheet.png', TILE_SIZE, 5);
    const enemyTextures = loadTextureSheet('enemySheet.png', TILE_SIZE, 2);
    const projectileTextures = loadTextureSheet('projectileSheet.png', TILE_SIZE, 3);

    const background = new Container();
    background.zIndex = -1;
    background.x = VIRTUAL_WIDTH * 0.5 - MAP_WIDTH * TILE_SIZE * 0.5;
    background.y = VIRTUAL_HEIGHT * 0.5 - MAP_HEIGHT * TILE_SIZE * 0.5 + TILE_SIZE * 4;

    const playerBaseTexture = Texture.from('playerBase.png');
    const playerBaseSprite = new Sprite(playerBaseTexture);
    playerBaseSprite.anchor.x = 1.0;
    playerBaseSprite.anchor.y = 1.0;
    playerBaseSprite.y = MAP_HEIGHT * TILE_SIZE;
    background.addChild(playerBaseSprite);

    const enemyBaseTexture = Texture.from('enemyBase.png');
    const enemyBaseSprite = new Sprite(enemyBaseTexture);
    enemyBaseSprite.anchor.y = 1.0;
    enemyBaseSprite.x = MAP_WIDTH * TILE_SIZE;
    enemyBaseSprite.y = MAP_HEIGHT * TILE_SIZE;
    background.addChild(enemyBaseSprite);

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const i = (x + y * MAP_WIDTH) % 2;
            const newTile = new Sprite(tileTextures[i]);
            newTile.x = x * TILE_SIZE;
            newTile.y = y * TILE_SIZE;
            background.addChild(newTile);
        }
    }
    scaledView.addChild(background);

    onResize(view, scaledView);

    window.addEventListener('resize', () => onResize(view, scaledView));

    let state: State = {
        view,
        scaledView,
        input: new Input(),
        ui: new Ui(TILE_SIZE, 9, 3, {
            slotBackground: uiTextures[0],
            slotSelected: uiTextures[1],
            tabInventory: uiTextures[2],
            tabShop: uiTextures[3],
            tabSelected: uiTextures[1],
            buyButton: uiTextures[4],
        }, scaledView),
        projectileTextures,
        towerTextures,
        towerSprites: new Array(MAP_WIDTH * MAP_HEIGHT),
        entitySpriteContainer: new Container(),
        enemyTextures,
        enemies: [],
        enemySpawner: new EnemySpawner(1),
        map: new TowerMap(MAP_WIDTH, MAP_HEIGHT, TILE_SIZE),
        projectiles: [],
    };

    state.input.addListeners();

    state.entitySpriteContainer.x = background.x;
    state.entitySpriteContainer.y = background.y;
    scaledView.addChild(state.entitySpriteContainer);

    app.ticker.add(() => update(state, app.ticker.deltaMS * 0.001));
}

main();