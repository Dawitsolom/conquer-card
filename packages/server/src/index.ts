import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { getEngineStatus } from "@conquer-card/engine";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: getEngineStatus() });
});

io.on("connection", (socket) => {
  console.log("Player connected: " + socket.id);
  socket.on("join_room", (roomId: string) => {
    void socket.join(roomId);
    io.to(roomId).emit("player_joined", { playerId: socket.id, roomId });
  });
  socket.on("disconnect", () => {
    console.log("Player disconnected: " + socket.id);
  });
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log("Conquer Card server running on port " + PORT);
  console.log("Engine: " + getEngineStatus());
});

export { app, io };
