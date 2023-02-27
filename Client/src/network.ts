import { Container } from 'pixi.js';
import io, { Socket } from 'socket.io-client';
import { DestructableMap } from './entities/destructable';
import { Enemy, EnemyStats } from './entities/enemy';
import { EnemySpawner } from './entities/enemySpawner';
import { ParticleSpawner } from './entities/particleSpawner';
import { Projectile } from './entities/projectile';
import { TileMap } from './map/tileMap';
import { Tower, TowerStats } from './entities/tower';
import { TowerMap } from './map/towerMap';
import { Ui } from './interface/ui';

type EnemySpawnData = {
    statsIndex: number;
    x: number;
    lane: number;
    id: number;
    moving: boolean,
}

type ProjectileSpawnData = {
    towerStatsIndex: number;
    x: number;
    y: number;
    id: number;
}

type TowerSpawnData = {
    statsIndex: number;
    x: number;
    y: number;
    ownerId: string;
}

type HostState = {
    isStarted: boolean;
    wave: number;
    enemySpawns: EnemySpawnData[],
    projectileSpawns: ProjectileSpawnData[],
    towerSpawns: TowerSpawnData[],
};

interface ServerToClientEvents {
    start: () => void;
    getState: (forId: string) => void;
    setState: (state: HostState) => void;
    promoteToHost: () => void;
    hostPlaceTower: (x: number, y: number, towerIndex: number, ownerId: string) => void;
    placeTower: (x: number, y: number, towerIndex: number, ownerId: string) => void;
    refundPlaceTower: (towerIndex: number) => void;
    hostRemoveTower: (x: number, y: number) => void;
    removeTower: (x: number, y: number) => void;
    spawnProjectile: (spawnData: ProjectileSpawnData) => void;
    removeProjectile: (id: number) => void;
    spawnEnemy: (spawnData: EnemySpawnData) => void;
    removeEnemy: (id: number) => void;
    setEnemyMoving: (id: number, moving: boolean) => void;
    setWave: (wave: number, active: boolean) => void;
    removePlayerTowers: (ownerId: string) => void;
    roomClosed: () => void;
}

interface ClientToServerEvents {
    returnState: (state: HostState, forId: string) => void;
    joinRoom: (roomName: string) => void;
    leaveRoom: () => void;
    start: () => void;
    requestPlaceTower: (x: number, y: number, towerIndex: number) => void;
    syncPlaceTower: (x: number, y: number, towerIndex: number, ownerId: string) => void;
    failedPlaceTower: (towerIndex: number, ownerId: string) => void;
    requestRemoveTower: (x: number, y: number) => void;
    syncRemoveTower: (x: number, y: number) => void;
    syncSpawnProjectile: (spawnData: ProjectileSpawnData) => void;
    syncRemoveProjectile: (id: number) => void;
    syncSpawnEnemy: (spawnData: EnemySpawnData) => void;
    syncRemoveEnemy: (id: number) => void;
    syncEnemyMoving: (id: number, moving: boolean) => void;
    syncWave: (wave: number, active: boolean) => void;
}

export class Network {
    private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    private connected: boolean;
    private host: boolean;
    private connectEvent: Event;
    private disconnectEvent: Event;

    constructor() {
        this.socket = io();
        this.connected = false;
        this.host = false;
        this.connectEvent = new Event("connect");
        this.disconnectEvent = new Event("disconnect");
    }

    addListeners = (ui: Ui, enemySpawner: EnemySpawner, enemies: DestructableMap<number, Enemy>,
        towerMap: TowerMap, tileMap: TileMap, projectiles: DestructableMap<number, Projectile>,
        particleSpawner: ParticleSpawner, entitySpriteContainer: Container) => {

        const resetState = () => {
            enemies.clear(particleSpawner);
            enemySpawner.reset();

            for (let y = 0; y < towerMap.height; y++) {
                for (let x = 0; x < towerMap.width; x++) {
                    towerMap.removeTower(x, y, tileMap, ui,
                        particleSpawner, this);
                }
            }

            projectiles.clear(particleSpawner);
        }

        addEventListener("connect", () => {
            resetState();
        });

        addEventListener("disconnect", () => {
            resetState();
        });

        this.socket.on("start", () => {
            ui.start(enemySpawner);
        });

        this.socket.on("getState", (forId) => {
            let enemySpawns: EnemySpawnData[] = [];

            for (let [id, enemy] of enemies) {
                enemySpawns.push({
                    statsIndex: enemy.stats.index,
                    x: enemy.getX(),
                    lane: enemy.lane,
                    id,
                    moving: enemy.isMoving(),
                });
            }

            let projectileSpawns: ProjectileSpawnData[] = [];

            for (let [id, projectile] of projectiles) {
                projectileSpawns.push({
                    towerStatsIndex: projectile.stats.towerIndex,
                    x: projectile.getX(),
                    y: projectile.getY(),
                    id,
                })
            }

            let towerSpawns: TowerSpawnData[] = [];

            for (let y = 0; y < towerMap.height; y++) {
                for (let x = 0; x < towerMap.width; x++) {
                    const tower = towerMap.getTower(x, y);
                    if (tower.stats.empty) {
                        continue;
                    }

                    towerSpawns.push({
                        statsIndex: tower.stats.index,
                        ownerId: tower.ownerId,
                        x,
                        y,
                    });
                }
            }

            this.socket.emit("returnState", {
                isStarted: enemySpawner.isActive(),
                wave: enemySpawner.getWave(),
                enemySpawns,
                projectileSpawns,
                towerSpawns,
            }, forId);
        });

        this.socket.on("setState", (state) => {
            if (state.isStarted) {
                enemySpawner.start();
                enemySpawner.setWave(state.wave);
            }

            for (let spawnData of state.enemySpawns) {
                enemies.set(spawnData.id, new Enemy(
                    EnemyStats.loadedEnemyStats[spawnData.statsIndex],
                    spawnData.x,
                    spawnData.lane,
                    towerMap.tileSize,
                    entitySpriteContainer,
                    spawnData.moving,
                ), particleSpawner);
            }

            for (let spawnData of state.projectileSpawns) {
                const stats = TowerStats.loadedTowerStats[spawnData.towerStatsIndex].projectileStats;

                if (stats == null) {
                    continue;
                }

                projectiles.set(spawnData.id, new Projectile(
                    stats,
                    spawnData.x,
                    spawnData.y,
                    entitySpriteContainer,
                ), particleSpawner);
            }

            for (let spawnData of state.towerSpawns) {
                const towerStats = TowerStats.loadedTowerStats[spawnData.statsIndex];
                const tower = new Tower(towerStats, spawnData.ownerId);
                towerMap.setTower(spawnData.x, spawnData.y, tower, tileMap, particleSpawner);
            }
        });

        this.socket.on("promoteToHost", () => {
            this.host = true;
        });

        this.socket.on("hostPlaceTower", (x, y, towerIndex, ownerId) => {
            if (!towerMap.getTowerStats(x, y).empty) {
                this.socket.emit("failedPlaceTower", towerIndex, ownerId);
                return;
            }

            const tower = new Tower(TowerStats.loadedTowerStats[towerIndex], ownerId);
            towerMap.setTower(x, y, tower, tileMap, particleSpawner);
            this.socket.emit("syncPlaceTower", x, y, towerIndex, ownerId);
        });

        this.socket.on("refundPlaceTower", (towerIndex) => {
            ui.inventory.stopUsingTower(TowerStats.loadedTowerStats[towerIndex], 1);
        });

        this.socket.on("placeTower", (x, y, towerIndex, ownerId) => {
            const tower = new Tower(TowerStats.loadedTowerStats[towerIndex], ownerId);
            towerMap.setTower(x, y, tower, tileMap, particleSpawner);
        });

        this.socket.on("hostRemoveTower", (x, y) => {
            if (towerMap.getTowerStats(x, y).empty) {
                return;
            }

            towerMap.setTower(x, y, Tower.empty, tileMap, particleSpawner);
            this.socket.emit("syncRemoveTower", x, y);
        });

        this.socket.on("removeTower", (x, y) => {
            towerMap.removeTower(x, y, tileMap, ui, particleSpawner, this);
        });

        this.socket.on("spawnProjectile", (spawnData) => {
            const stats = TowerStats.loadedTowerStats[spawnData.towerStatsIndex].projectileStats;

            if (stats == null) {
                return;
            }

            projectiles.set(spawnData.id, new Projectile(
                stats,
                spawnData.x,
                spawnData.y,
                entitySpriteContainer,
            ), particleSpawner);
        });

        this.socket.on("removeProjectile", (id) => {
            projectiles.delete(id, particleSpawner);
        });

        this.socket.on("spawnEnemy", (spawnData) => {
            const stats = EnemyStats.loadedEnemyStats[spawnData.statsIndex];

            enemies.set(spawnData.id, new Enemy(
                stats,
                spawnData.x,
                spawnData.lane,
                tileMap.tileSize,
                entitySpriteContainer,
                spawnData.moving,
            ), particleSpawner);
        });

        this.socket.on("removeEnemy", (id) => {
            const enemy = enemies.get(id);
            if (enemy != undefined) {
                ui.bank.addMoney(enemy.stats.value);
            }

            enemies.delete(id, particleSpawner);
        });

        this.socket.on("setEnemyMoving", (id, moving) => {
            const enemy = enemies.get(id);
            if (enemy == undefined) {
                return;
            }

            enemy.setMoving(moving);
        });

        this.socket.on("setWave", (wave, active) => {
            if (enemySpawner.isActive() && !active) {
                enemySpawner.reset();
            } else if (!enemySpawner.isActive() && active) {
                enemySpawner.start();
            }

            enemySpawner.setWave(wave);
        });

        this.socket.on("removePlayerTowers", (ownerId: string) => {
            for (let y = 0; y < towerMap.height; y++) {
                for (let x = 0; x < towerMap.width; x++) {
                    const tower = towerMap.getTower(x, y);
                    if (tower.stats.empty) {
                        continue;
                    }

                    if (tower.ownerId != ownerId) {
                        continue;
                    }

                    towerMap.setTower(x, y, Tower.empty, tileMap, particleSpawner);
                    this.syncRemoveTower(x, y);
                }
            }
        });

        this.socket.on("roomClosed", () => {
            this.disconnect();
        });
    }

    connect = (roomName: string) => {
        if (this.connected) {
            return;
        }

        this.socket.emit("joinRoom", roomName);
        this.connected = true;
        dispatchEvent(this.connectEvent);
    }

    disconnect = () => {
        if (!this.connected) {
            return;
        }

        this.host = false;

        this.socket.emit("leaveRoom");
        this.connected = false;
        dispatchEvent(this.disconnectEvent);
    }

    isConnected = (): boolean => {
        return this.connected;
    }

    syncStart = () => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("start");
    }

    requestPlaceTower = (x: number, y: number, towerIndex: number) => {
        this.socket.emit("requestPlaceTower", x, y, towerIndex);
    }

    requestRemoveTower = (x: number, y: number) => {
        this.socket.emit("requestRemoveTower", x, y);
    }

    syncPlaceTower = (x: number, y: number, towerIndex: number) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncPlaceTower", x, y, towerIndex, this.socket.id);
    }

    syncRemoveTower = (x: number, y: number) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncRemoveTower", x, y);
    }

    syncSpawnProjectile = (id: number, projectile: Projectile) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncSpawnProjectile", {
            towerStatsIndex: projectile.stats.towerIndex,
            x: projectile.getX(),
            y: projectile.getY(),
            id,
        });
    }

    syncRemoveProjectile = (id: number) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncRemoveProjectile", id);
    }

    syncSpawnEnemy = (id: number, enemy: Enemy) => {
        if (!this.connect) {
            return;
        }

        this.socket.emit("syncSpawnEnemy", {
            statsIndex: enemy.stats.index,
            x: enemy.getX(),
            lane: enemy.lane,
            id,
            moving: enemy.isMoving(),
        });
    }

    syncRemoveEnemy = (id: number) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncRemoveEnemy", id);
    }

    syncSetEnemyMoving = (id: number, moving: boolean) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncEnemyMoving", id, moving);
    }

    syncWave = (wave: number, active: boolean) => {
        if (!this.connected) {
            return;
        }

        this.socket.emit("syncWave", wave, active);
    }

    isHost = (): boolean => {
        return this.host;
    }

    isInControl = (): boolean => {
        return !this.connected || this.host;
    }

    getLocalId = (): string => {
        if (!this.isConnected) {
            return "";
        }

        return this.socket.id;
    }
}