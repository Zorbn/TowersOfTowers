import express from "express";
import * as http from "http";
import { resolve } from "path";
import { Server, Socket } from "socket.io";

const PORT = 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const playerRooms = new Map<string, string>();
const roomHosts = new Map<string, string>();

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

type HostState = {
    isStarted: boolean;
    wave: number;
    enemySpawns: EnemySpawnData[],
    projectileSpawns: ProjectileSpawnData[],
    towerSpawns: TowerSpawnData[],
};

app.use(express.static(resolve(__dirname + "../../../Client/dist")))

const leaveRoom = (socket: Socket) => {
    const currentRoom = playerRooms.get(socket.id);
    if (currentRoom == undefined) {
        return;
    }

    socket.leave(currentRoom);
    playerRooms.delete(socket.id);

    // If this player was the host of its room, find a new host.
    const roomHost = roomHosts.get(currentRoom);
    if (roomHost == socket.id) {
        roomHosts.delete(currentRoom);

        const otherClientsInRoom = io.sockets.adapter.rooms.get(currentRoom);
        if (otherClientsInRoom != undefined) {
            for (let otherClient of otherClientsInRoom) {
                roomHosts.set(currentRoom, otherClient);
                socket.emit("promoteToHost");
                break;
            }
        }
    }
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
});

httpServer.listen(PORT, () => {
    console.log("Listening on: " + PORT);
});