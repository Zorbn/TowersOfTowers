import { Application, Sprite, Container, Texture, SCALE_MODES, BitmapFont } from "pixi.js";
import { Input } from "./input";
import { World } from "./world";
import { Ui } from "./ui";
import { EnemySpawner } from "./enemySpawner";
import { TowerMap } from "./towerMap";
import { tileTextures } from "./textureSheet";
import { TileMap } from "./tileMap";
import { ParticleSpawner } from "./particleSpawner";
import { Network } from "./network";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 240;

const MAP_WIDTH = 15;
const MAP_HEIGHT = 4;
const TILE_SIZE = 16;
const BASE_WIDTH = 3;

// TODO:
// Animated enemies?
// Networking?

/*
 * Networking:
 * Add UI to enter room code and join, or leave if you are already in one,
 * Three states: LOCAL, HOST, CLIENT
 * First player the join the room is the HOST
 * Current update runs for LOCAL & HOST
 * Update without any spawning/destroying runs for CLIENT
 * Add functions to send WS info for spawning/destroying and enemy start/stop to those functions
 * Networking functions do nothing if run on a LOCAL player
 * Simple server that serve's the client and uses WS to relay messages to players in the same room,
 * When a player disconnects swap hosts if they are the host (if possible) and remove player's buildings.
 */

/*
 * Sync current state on join
 * Sync new updates
 * Sync disconnecting
 */

const onResize = (view: Container) => {
    let scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);

    view.scale.x = scale;
    view.scale.y = scale;

    view.x = window.innerWidth / 2 - (VIEW_WIDTH * scale) / 2;
    view.y = window.innerHeight / 2 - (VIEW_HEIGHT * scale) / 2;
}

const updateEnemies = (world: World, deltaTime: number) => {
    world.enemySpawner.update(world.enemies, world.towerMap, world.entitySpriteContainer, deltaTime);

    let enemyInPlayerBase = false;

    for (let enemy of world.enemies) {
        enemy.update(deltaTime, world.towerMap, world.particleSpawner);

        // Check if the enemy has reached the player's base.
        if (enemy.getX() < -TILE_SIZE) {
            enemyInPlayerBase = true;
            break;
        }
    }

    if (enemyInPlayerBase) {
        for (let enemy of world.enemies) {
            enemy.destroy(world.particleSpawner);
        }

        world.enemies.splice(0, world.enemies.length);
        world.enemySpawner.reset();
    }
}

const updateCommon = async (world: World, deltaTime: number) => {
    world.ui.update(world.input);
    world.ui.draw(world.enemySpawner, TILE_SIZE);

    for (let i = world.particles.length - 1; i >= 0; i--) {
        const particle = world.particles[i];

        if (particle.update(deltaTime)) {
            particle.destroy(world.particleSpawner);
            world.particles.splice(i, 1);
        }
    }

    // TODO: Remove this.
    if (world.input.wasKeyPressed("KeyM")) {
        world.ui.bank.addMoney(25);
    }

    if (world.input.wasMouseButtonPressed(0)) {
        const mouseX = world.input.getMouseX();
        const mouseY = world.input.getMouseY();
        const mouseWorldX = world.input.getMouseWorldX(world.view);
        const mouseWorldY = world.input.getMouseWorldY(world.view);
        const mouseTileX = (mouseWorldX - world.entitySpriteContainer.x) / TILE_SIZE;
        const mouseTileY = (mouseWorldY - world.entitySpriteContainer.y) / TILE_SIZE;

        world.ui.interact(mouseWorldX, mouseWorldY, mouseX, mouseY, world.towerMap, world.enemySpawner, world.network);

        world.towerMap.tryPlaceTower(mouseTileX, mouseTileY, world.tileMap, world.ui, world.particleSpawner, world.network);
    }
}

const updatePostCommon = async (world: World) => {
    world.particleSpawner.update(world.particles, world.entitySpriteContainer);
    world.input.update();
}

const updateHost = async (world: World, deltaTime: number) => {
    updateEnemies(world, deltaTime);

    for (let i = world.projectiles.length - 1; i >= 0; i--) {
        const projectile = world.projectiles[i];

        // Remove the projectile if it had a collision.
        if (projectile.update(world.ui, world.enemies, world.towerMap, world.particleSpawner, deltaTime)) {
            projectile.destroy(world.particleSpawner);
            world.projectiles.splice(i, 1);
        }
    }

    world.towerMap.update(world.projectiles, world.entitySpriteContainer, deltaTime);
}

// const updateClient = async (world: World, _deltaTime: number) => {
// }

const update = async (world: World, deltaTime: number) => {
    updateCommon(world, deltaTime);

    if (world.network.isInControl()) {
        updateHost(world, deltaTime);
    } else {
        // updateClient(world, deltaTime);
    }

    updatePostCommon(world);
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
    view.sortableChildren = true;
    app.stage.addChild(view);

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

    const backdropTexture = Texture.from("backdrop.png");
    backdropTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
    const backdropSprite = new Sprite(backdropTexture);
    backdropSprite.zIndex = -2;
    view.addChild(backdropSprite);

    const entitySpriteContainer = new Container();

    let world: World = {
        view,
        input: new Input(),
        ui: new Ui(TILE_SIZE, 9, 3, VIEW_WIDTH, VIEW_HEIGHT, view),
        network: new Network(),
        entitySpriteContainer,
        enemies: [],
        enemySpawner: new EnemySpawner(),
        towerMap: new TowerMap(MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, entitySpriteContainer),
        tileMap: new TileMap(MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, background),
        projectiles: [],
        particles: [],
        particleSpawner: new ParticleSpawner(),
    };

    world.network.addListeners(world.ui, world.enemySpawner, world.enemies, world.towerMap, world.tileMap, world.projectiles, world.particleSpawner, world.entitySpriteContainer);
    world.input.addListeners();

    world.entitySpriteContainer.x = background.x;
    world.entitySpriteContainer.y = background.y;
    view.addChild(world.entitySpriteContainer);

    for (let x = -BASE_WIDTH; x < MAP_WIDTH + BASE_WIDTH; x++) {
        const edgeTile = new Sprite(tileTextures[2]);
        edgeTile.x = x * TILE_SIZE;
        edgeTile.y = MAP_HEIGHT * TILE_SIZE;
        background.addChild(edgeTile);
    }

    view.addChild(background);

    onResize(view);

    window.addEventListener("resize", () => onResize(view));

    app.ticker.add(() => update(world, app.ticker.deltaMS * 0.001));
}

main();