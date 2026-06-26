import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { CombatRoom } from "./rooms/CombatRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true, game: "aetherfall" }));

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("combat", CombatRoom);

gameServer.listen(PORT).then(() => {
  console.log(`⚔️  Aetherfall – serwer walki nasłuchuje na ws://localhost:${PORT}`);
});
