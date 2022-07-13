import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { MyRoom } from "./room/MyRoom";
import { monitor } from "@colyseus/monitor";

const app = express();
const port = Number(process.env.PORT || 3663);

app.use(cors());
app.use(express.json());
app.use("/colyseus", monitor());

const server = http.createServer(app);
const gameServer = new Server({
  server: server,
});

gameServer.define("myRoom", MyRoom);
gameServer.listen(port);

console.log(`Listening on ws://localhost:${port}`);
