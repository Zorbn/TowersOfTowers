import express from "express";
import * as http from "http";
import { resolve } from "path";
import { Server, Socket } from "socket.io";

const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const playerRooms = new Map<string, string>();
const roomHosts = new Map<string, string>();

type EnemySpawnData = {
    statsIndex: number;
    x: number;
    lane: number;
    id: number;
    moving: boolean;
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
    ownerId: string;
}

type HostState = {
    isStarted: boolean;
    wave: number;
    enemySpawns: EnemySpawnData[],
    projectileSpawns: ProjectileSpawnData[],
    towerSpawns: TowerSpawnData[],
};

console.log(resolve(__dirname + "../../../Client/dist"));
app.use(express.static(resolve(__dirname + "../../../Client/dist")))

const leaveRoom = (socket: Socket) => {
    const room = playerRooms.get(socket.id);
    if (room == undefined) {
        return;
    }

    socket.leave(room);
    playerRooms.delete(socket.id);

    const roomHost = roomHosts.get(room);

    // If this player was the host of its room, close the room.
    if (roomHost == socket.id) {
        io.to(room).emit("roomClosed");
        roomHosts.delete(room);
        return;
    }

    // Remove the disconnecting player's towers.
    if (roomHost != undefined) {
        io.to(roomHost).emit("removePlayerTowers", socket.id);
    }
}

// If the player is the host of a room, return that room.
const getHostRoom = (id: string): string | null => {
    const room = playerRooms.get(id);
    if (room == undefined) {
        return null;
    }

    const roomHost = roomHosts.get(room);
    if (roomHost == undefined) {
        return null;
    }

    if (roomHost != id) {
        return null;
    }

    return room;
}

// If the player is in a room, return the room's host.
const getRoomHost = (id: string): string | null => {
    const room = playerRooms.get(id);
    if (room == undefined) {
        return null;
    }

    const roomHost = roomHosts.get(room);
    if (roomHost == undefined) {
        return null;
    }

    return roomHost;
}

io.on("connection", (socket) => {
    socket.on("joinRoom", (roomName) => {
        if (playerRooms.has(socket.id)) {
            return;
        }

        playerRooms.set(socket.id, roomName);
        socket.join(roomName);

        // Room doesn't have a host, this player is the new host.
        if (!roomHosts.has(roomName)) {
            roomHosts.set(roomName, socket.id);
            socket.emit("promoteToHost");
        }
        // Room does have a host, ask it for the current state.
        else {
            const roomHost = roomHosts.get(roomName)!;
            io.to(roomHost).emit("getState", socket.id);
        }
    });

    socket.on("leaveRoom", () => {
        leaveRoom(socket);
    });

    socket.on("disconnect", () => {
        leaveRoom(socket);
    });

    socket.on("start", () => {
        const room = playerRooms.get(socket.id);
        if (room == undefined) {
            return;
        }

        io.to(room).emit("start");
    });

    socket.on("returnState", (state: HostState, forId: string) => {
        io.to(forId).emit("setState", state);
    })

    socket.on("requestPlaceTower", (x: number, y: number, towerIndex: number) => {
        const roomHost = getRoomHost(socket.id);
        if (roomHost == null) {
            return;
        }

        io.to(roomHost).emit("hostPlaceTower", x, y, towerIndex, socket.id);
    });

    socket.on("failedPlaceTower", (towerIndex: number, ownerId: string) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        io.to(ownerId).emit("refundPlaceTower", towerIndex);
    });

    socket.on("syncPlaceTower", (x: number, y: number, towerIndex: number, ownerId: string) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("placeTower", x, y, towerIndex, ownerId);
    });

    socket.on("requestRemoveTower", (x: number, y: number) => {
        const roomHost = getRoomHost(socket.id);
        if (roomHost == null) {
            return;
        }

        io.to(roomHost).emit("hostRemoveTower", x, y);
    });

    socket.on("syncRemoveTower", (x: number, y: number) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("removeTower", x, y);
    });

    socket.on("syncSpawnProjectile", (spawnData: ProjectileSpawnData) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("spawnProjectile", spawnData);
    });

    socket.on("syncRemoveProjectile", (id: number) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("removeProjectile", id);
    });

    socket.on("syncSpawnEnemy", (spawnData: EnemySpawnData) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("spawnEnemy", spawnData);
    });

    socket.on("syncRemoveEnemy", (id: number) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("removeEnemy", id);
    });

    socket.on("syncEnemyMoving", (id: number, moving: boolean) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("setEnemyMoving", id, moving);
    });

    socket.on("syncWave", (wave: number, active: boolean) => {
        const room = getHostRoom(socket.id);
        if (room == null) {
            return;
        }

        socket.broadcast.to(room).emit("setWave", wave, active);
    });
});

httpServer.listen(PORT, () => {
    console.log("Listening on: " + PORT);
});