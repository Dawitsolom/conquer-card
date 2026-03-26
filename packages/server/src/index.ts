import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initSentry } from "./lib/sentry";
import { getEngineStatus } from "@conquer-card/engine";
import { registerAuthMiddleware, registerGameEvents } from "./sockets/gameEvents";
import authRouter   from "./routes/auth";
import tablesRouter from "./routes/tables";
import shopRouter   from "./routes/shop";
import { authMiddleware, AuthRequest } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import { Response } from "express";

// ── Init ──────────────────────────────────────────────────────────────────────

initSentry();

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// ── REST routes ───────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: getEngineStatus() });
});

app.use("/auth",   authRouter);
app.use("/tables", tablesRouter);
app.use("/shop",   shopRouter);

// ── /profile routes ───────────────────────────────────────────────────────────

app.get("/profile/:userId", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params["userId"] as string;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, displayName: true, avatarUrl: true,
        coinBalance: true, totalRoundsPlayed: true,
        totalRoundsWon: true, doubleWins: true, isGuest: true,
      },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    console.error("[GET /profile/:userId]", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.patch("/profile/:userId", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params["userId"] as string;
  if (userId !== req.user!.id) { res.status(403).json({ error: "Cannot edit another user's profile" }); return; }
  const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data:  { displayName, avatarUrl },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    res.json(user);
  } catch (err) {
    console.error("[PATCH /profile/:userId]", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

registerAuthMiddleware(io);   // verify Firebase token on every connection

io.on("connection", (socket) => {
  registerGameEvents(io, socket);
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

export { app, io };
