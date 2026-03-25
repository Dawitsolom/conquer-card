import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { createGameState, startGame, applyAction, getWinner } from "@conquer-card/engine";
import type { GameState, GameAction } from "@conquer-card/engine";

const rooms = new Map<string, GameState>();

export function registerGameEvents(io: Server, socket: Socket): void {
  const playerId = socket.id;

  socket.on("join_room", async (data: { roomId: string; userId: string; name: string }) => {
    const { roomId, userId, name } = data;
    await socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, createGameState(roomId, []));
    }

    let state = rooms.get(roomId)!;
    const alreadyIn = state.players.find(p => p.id === userId);
    if (!alreadyIn) {
      state = { ...state, players: [...state.players, { id: userId, name, hand: [], score: 0, isConnected: true }] };
      rooms.set(roomId, state);
    }

    io.to(roomId).emit("room_state", state);
    console.log();
  });

  socket.on("start_game", (data: { roomId: string }) => {
    const { roomId } = data;
    let state = rooms.get(roomId);
    if (!state || state.players.length < 2) {
      socket.emit("error", { message: "Need at least 2 players to start" });
      return;
    }
    state = startGame(state);
    rooms.set(roomId, state);
    io.to(roomId).emit("game_started", state);
    console.log();
  });

  socket.on("play_card", (data: { roomId: string; action: GameAction }) => {
    const { roomId, action } = data;
    let state = rooms.get(roomId);
    if (!state) { socket.emit("error", { message: "Room not found" }); return; }

    state = applyAction(state, action);
    rooms.set(roomId, state);
    io.to(roomId).emit("game_state", state);

    if (state.phase === "finished") {
      const winner = getWinner(state);
      io.to(roomId).emit("game_over", { winner, finalState: state });
      void saveGameResult(roomId, state);
    }
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach(roomId => {
      const state = rooms.get(roomId);
      if (state) {
        const updated = { ...state, players: state.players.map(p => p.id === playerId ? { ...p, isConnected: false } : p) };
        rooms.set(roomId, updated);
        io.to(roomId).emit("player_disconnected", { playerId });
      }
    });
  });
}

async function saveGameResult(roomId: string, state: GameState): Promise<void> {
  try {
    const game = await prisma.game.findUnique({ where: { roomId } });
    if (!game) return;
    await prisma.game.update({ where: { roomId }, data: { status: "FINISHED" } });
    const winner = getWinner(state);
    for (const player of state.players) {
      await prisma.gamePlayer.updateMany({
        where: { gameId: game.id, userId: player.id },
        data: { score: player.score, isWinner: winner?.id === player.id },
      });
    }
  } catch (e) { console.error("Failed to save game result:", e); }
}