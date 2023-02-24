import { Container } from 'pixi.js';
import io, { Socket } from 'socket.io-client';
import { Enemy, EnemyStats } from './enemy';
import { EnemySpawner } from './enemySpawner';
import { ParticleSpawner } from './particleSpawner';
import { Projectile } from './projectile';
import { TileMap } from './tileMap';
import { Tower, TowerStats } from './tower';
import { TowerMap } from './towerMap';
import { Ui } from './ui';

/*
 = On start:
 + Sync wave number
 + Sync wave start
 + Sync enemy positions
 + Sync projectile positions
 + Sync tower positions
 = In game:
 * Sync enemy spawns/despawns
 * Sync enemy starts/stops
 + Sync tower spawns/despawns
 + Prevent picking up other player's towers
 * Sync projectile spawns/despawns
 = On connect/disconnect:
 * Remove local enemies
 * Remove local projectiles
 * Remove local towers
 * Reset enemy spawner/wave
 */

type EnemySpawnData = {
    statsIndex: number;
    x: number;
    lane: number;
}

type ProjectileSpawnData = {
    towerStatsIndex: number;
    x: number;
    y: number;
}

type TowerSpawnData = {
    statsIndex: number;
    x: number;
    y: number;
}

// TODO: Reset state upon connecting/disconnecting.
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
    hostPlaceTower: (x: number, y: number, towerIndex: number, forId: string) => void;
    remotePlaceTower: (x: number, y: number, towerIndex: number) => void;
    localPlaceTower: (x: number, y: number, towerIndex: number) => void;
    refundPlaceTower: (towerIndex: number) => void;
    hostRemoveTower: (x: number, y: number) => void;
    removeTower: (x: number, y: number) => void;
}

interface ClientToServerEvents {
    returnState: (state: HostState, forId: string) => void;
    joinRoom: (roomName: string) => void;
    leaveRoom: () => void;
    start: () => void;
    requestPlaceTower: (x: number, y: number, towerIndex: number) => void;
    syncPlaceTower: (x: number, y: number, towerIndex: number, forId: string) => void;
    failedPlaceTower: (towerIndex: number, forId: string) => void;
    requestRemoveTower: (x: number, y: number) => void;
    syncRemoveTower: (x: number, y: number) => void;
}

export class Network {
    private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    private connected: boolean;
    private host: boolean;

    constructor() {
        this.socket = io();
        this.connected = false;
        this.host = false;
    }

    addListeners = (ui: Ui, enemySpawner: EnemySpawner, enemies: Enemy[], towerMap: TowerMap, tileMap: TileMap, projectiles: Projectile[], particleSpawner: ParticleSpawner, entitySpriteContainer: Container) => {
        this.socket.on("start", () => {
            ui.start(enemySpawner);
        });

        this.socket.on("getState", (forId) => {
            let enemySpawns: EnemySpawnData[] = [];

            for (let enemy of enemies) {
                enemySpawns.push({
                    statsIndex: enemy.stats.index,
                    x: enemy.getX(),
                    lane: enemy.lane,
                });
            }

            let projectileSpawns: ProjectileSpawnData[] = [];

            for (let projectile of projectiles) {
                projectileSpawns.push({
                    towerStatsIndex: projectile.stats.towerIndex,
                    x: projectile.getX(),
                    y: projectile.getY(),
                })
            }

            let towerSpawns: TowerSpawnData[] = [];

            for (let y = 0; y < towerMap.height; y++) {
                for (let x = 0; x < towerMap.width; x++) {
                    const tower = towerMap.getTower(x, y);
                    if (tower.stats.empty) {
                        continue;
                    }

                    towerSpawns.push({ statsIndex: tower.stats.index, x, y });
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

            for (let spawn of state.enemySpawns) {
                enemies.push(new Enemy(
                    EnemyStats.loadedEnemyStats[spawn.statsIndex],
                    spawn.x,
                    spawn.lane,
                    towerMap.tileSize,
                    entitySpriteContainer,
                ));
            }

            for (let spawn of state.projectileSpawns) {
                const stats = TowerStats.loadedTowerStats[spawn.towerStatsIndex].projectileStats;

                if (stats == null) {
                    continue;
                }

                projectiles.push(new Projectile(
                    stats,
                    spawn.x,
                    spawn.y,
                    entitySpriteContainer,
                ));
            }

            for (let spawn of state.towerSpawns) {
                const towerStats = TowerStats.loadedTowerStats[spawn.statsIndex];
                const tower = new Tower(towerStats, false);
                towerMap.setTower(spawn.x, spawn.y, tower, tileMap, particleSpawner);
            }
        });

        this.socket.on("promoteToHost", () => {
            console.log("promoted");
            this.host = true;
        });

        this.socket.on("hostPlaceTower", (x, y, towerIndex, forId) => {
            if (!towerMap.getTowerStats(x, y).empty) {
                this.socket.emit("failedPlaceTower", towerIndex, forId);
                return;
            }

            const tower = new Tower(TowerStats.loadedTowerStats[towerIndex], false);
            towerMap.setTower(x, y, tower, tileMap, particleSpawner);
            this.socket.emit("syncPlaceTower", x, y, towerIndex, forId);
        });

        this.socket.on("refundPlaceTower", (towerIndex) => {
            ui.inventory.stopUsingTower(TowerStats.loadedTowerStats[towerIndex], 1);
        });

        this.socket.on("localPlaceTower", (x, y, towerIndex) => {
            const tower = new Tower(TowerStats.loadedTowerStats[towerIndex]);
            towerMap.setTower(x, y, tower, tileMap, particleSpawner);
        });

        this.socket.on("remotePlaceTower", (x, y, towerIndex) => {
            const tower = new Tower(TowerStats.loadedTowerStats[towerIndex], false);
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
            const tower = towerMap.getTower(x, y);

            if (tower.stats.empty) {
                return;
            }

            if (tower.locallyOwned) {
                ui.inventory.stopUsingTower(tower.stats, 1);
            }

            towerMap.setTower(x, y, Tower.empty, tileMap, particleSpawner);
        });
    }

    connect = (roomName: string) => {
        if (this.connected) {
            return;
        }

        this.socket.emit("joinRoom", roomName);
        this.connected = true;
    }

    disconnect = () => {
        if (!this.connected) {
            return;
        }

        this.host = false;

        this.socket.emit("leaveRoom");
        this.connected = false;
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
        this.socket.emit("syncPlaceTower", x, y, towerIndex, this.socket.id);
    }

    syncRemoveTower = (x: number, y: number) => {
        this.socket.emit("syncRemoveTower", x, y);
    }

    isHost = (): boolean => {
        return this.host;
    }

    isInControl = (): boolean => {
        return !this.connected || this.host;
    }
}