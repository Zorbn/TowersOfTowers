import './style.css';
import { Application, Sprite, Container, Texture, Rectangle, SCALE_MODES, BitmapFont, BitmapText } from 'pixi.js';
import { Tower } from './tower';
import { Input } from './input';
import { State } from './state';
import { Ui } from './ui';

const VIRTUAL_WIDTH = 320;
const VIRTUAL_HEIGHT = 240;

const MAP_WIDTH = 15;
const MAP_HEIGHT = 4;
const TILE_SIZE = 16;

// TODO: Change the inventory to keep track of total & in-use rather than
// just quantity.

const onResize = (view: Container, scaledView: Container) => {
    let scale = Math.min(window.innerWidth / VIRTUAL_WIDTH, window.innerHeight / VIRTUAL_HEIGHT);

    scaledView.scale.x = scale;
    scaledView.scale.y = scale;

    view.x = window.innerWidth / 2 - (VIRTUAL_WIDTH * scale) / 2;
    view.y = window.innerHeight / 2 - (VIRTUAL_HEIGHT * scale) / 2;
}

// TODO: Don't create/delete new sprites, create sprites on init then
// change their textures like the UI does.
const setTower = (state: State, x: number, y: number, tower: Tower) => {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        return;
    }

    const i = x + y * MAP_WIDTH;

    const oldTower = getTower(state, x, y);
    if (!oldTower.empty && state.towerSprites[i] != null) {
        state.towerSpriteContainer.removeChild(state.towerSprites[i])
    }

    state.towers[i] = tower;
    const towerSprite = new Sprite(state.towerTextures[tower.textureIndex]);
    towerSprite.x = x * TILE_SIZE;
    towerSprite.y = y * TILE_SIZE;
    state.towerSpriteContainer.addChild(towerSprite);
    state.towerSprites[i] = towerSprite;
}

const getTower = (state: State, x: number, y: number): Tower => {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        return Tower.empty;
    }

    return state.towers[x + y * MAP_WIDTH];
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

const update = async (state: State, deltaTime: number) => {
    state.ui.draw(state.towerTextures);

    if (state.input.wasKeyPressed('KeyQ')) {
        state.ui.addItem(Tower.doubleShot, 2);
    }

    if (state.input.wasKeyPressed('KeyE')) {
        state.ui.addItem(Tower.singleShot, 2);
    }

    if (state.input.wasMouseButtonPressed(0)) {
        const mouseTileX = (state.input.getMouseX(state) - state.towerSpriteContainer.x) / TILE_SIZE;
        const mouseTileY = (state.input.getMouseY(state) - state.towerSpriteContainer.y) / TILE_SIZE;
        const mouseUiTileX = state.input.getMouseX(state) / TILE_SIZE;
        const mouseUiTileY = state.input.getMouseY(state) / TILE_SIZE;

        state.ui.selectSlot(mouseUiTileX, mouseUiTileY, TILE_SIZE);
        state.ui.selectTab(mouseUiTileX, mouseUiTileY, TILE_SIZE);

        const oldTower = getTower(state, mouseTileX, mouseTileY);
        if (!oldTower.empty) {
            state.ui.addItem(oldTower, 1);
            setTower(state, mouseTileX, mouseTileY, Tower.empty);
        } else {
            const selectedSlot = state.ui.getSelectedItem();
            if (!selectedSlot.tower.empty && selectedSlot.quantity > 0) {
                setTower(state, mouseTileX, mouseTileY, selectedSlot.tower);
            }
        }
    }

    state.input.update();
}

const main = async () => {
    const app = new Application({
        resizeTo: window,
        autoDensity: true,
    });
    document.body.appendChild(app.view as HTMLCanvasElement);

    const view = new Container();
    const scaledView = new Container();
    view.addChild(scaledView);
    scaledView.sortableChildren = true;
    app.stage.addChild(view);

    const tileTextures = loadTextureSheet('tileSheet.png', TILE_SIZE, 2);
    const towerTextures = loadTextureSheet('towerSheet.png', TILE_SIZE, 2);
    const uiTextures = loadTextureSheet('uiSheet.png', TILE_SIZE, 4);

    const playerTexture = Texture.from('1BitEngineer.png');
    const playerSprite = new Sprite(playerTexture);
    playerSprite.x = 0;
    playerSprite.y = 0;
    playerSprite.anchor.x = 0.5;
    playerSprite.anchor.y = 0.5;
    playerSprite.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    scaledView.addChild(playerSprite);

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
    window.addEventListener('keydown', (e) => {
        if (e.key == 'a') {
            playerSprite.x -= 1;
        }
    });

    BitmapFont.from('DefaultFont', {
        fontFamily: 'Oswald',
        fontSize: 64,
        fill: 'white',
    }, {
        chars: BitmapFont.ASCII,
    });

    const testText = new BitmapText('The towerinator $5', { fontName: 'DefaultFont' });
    testText.x = TILE_SIZE * 0.125;
    testText.y = TILE_SIZE * 3.125;
    testText.scale.x = 0.2;
    testText.scale.y = 0.2;
    testText.zIndex = 100;
    testText.updateText();
    scaledView.addChild(testText);

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
        }, scaledView),
        towers: new Array(MAP_WIDTH * MAP_HEIGHT),
        towerTextures,
        towerSprites: new Array(MAP_WIDTH * MAP_HEIGHT),
        towerSpriteContainer: new Container()
    };

    state.input.addListeners();

    state.towers.fill(Tower.empty);
    state.towerSpriteContainer.x = background.x;
    state.towerSpriteContainer.y = background.y;
    scaledView.addChild(state.towerSpriteContainer);

    app.ticker.add(() => update(state, app.ticker.deltaTime));
}

main();