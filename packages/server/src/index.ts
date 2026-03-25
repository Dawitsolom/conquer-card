import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { getEngineStatus } from "@conquer-card/engine";
import { authMiddleware } from "./middleware/auth";
import { registerGameEvents } from "./sockets/gameEvents";
import { prisma } from "./lib/prisma";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET","POST"] } });

app.use(cors());
app.use(express.json());

// Public routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: getEngineStatus() });
});

// Protected: create a game room in DB
app.post("/games", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const roomId = ;
    const game = await prisma.game.create({
      data: { roomId, players: { create: { userId: user.id } } },
      include: { players: true },
    });
    res.json(game);
  } catch (e) { res.status(500).json({ error: "Failed to create game" }); }
});

// Protected: get leaderboard
app.get("/leaderboard", authMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { _count: { select: { games: true } } },
      orderBy: { games: { _count: "desc" } },
      take: 10,
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: "Failed to fetch leaderboard" }); }
});

// Socket.io
io.on("connection", (socket) => {
  console.log();
  registerGameEvents(io, socket);
  socket.on("disconnect", () => console.log());
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log();
  console.log();
});

export { app, io };