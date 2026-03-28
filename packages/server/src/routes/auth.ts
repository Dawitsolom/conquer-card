import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme";

// =============================================================================
// routes/auth.ts  —  POST /auth/guest, POST /auth/verify
//
// Java analogy: @RestController with @RequestMapping("/auth")
// =============================================================================

const router = Router();

// ── POST /auth/guest ──────────────────────────────────────────────────────────
// Creates a guest session without Firebase.
// Flow:
//   1. Generate a random guestId (no Firebase call needed)
//   2. Upsert a Prisma User marked isGuest=true with 200-coin welcome bonus
//   3. Sign an app JWT and return { token, user }
//
// Java analogy: like issuing a short-lived JWT for an unauthenticated trial session.
router.post("/guest", async (_req: Request, res: Response): Promise<void> => {
  try {
    const guestId   = `guest_${randomUUID()}`;
    const digits    = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Guest_${digits}`;

    // upsert: create on first call, no-op on any subsequent call with same guestId
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.upsert({
        where:  { firebaseUid: guestId },
        update: {},   // guest IDs are UUIDs — collision is impossible; update is a no-op
        create: {
          firebaseUid: guestId,
          displayName: guestName,
          email:       null,
          isGuest:     true,
          coinBalance: 200,
        },
      });
      // Only create the welcome bonus transaction on first creation
      const existing = await tx.coinTransaction.findFirst({ where: { userId: created.id, type: "WELCOME_BONUS" } });
      if (!existing) {
        await tx.coinTransaction.create({
          data: { userId: created.id, amount: 200, type: "WELCOME_BONUS" },
        });
      }
      return created;
    });

    // Sign our own JWT — authMiddleware knows how to verify these for guests
    const token = jwt.sign(
      { sub: user.id, firebaseUid: user.firebaseUid, displayName: user.displayName, isGuest: true },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      token,
      user: { id: user.id, displayName: user.displayName, isGuest: true, coinBalance: user.coinBalance },
    });
  } catch (err) {
    console.error("[POST /auth/guest]", err);
    res.status(500).json({ error: "Failed to create guest account" });
  }
});

// ── POST /auth/verify ─────────────────────────────────────────────────────────
// Verifies a Firebase ID token and returns the Prisma user profile.
// Used on first launch (registered users) and after any token refresh.
// The authMiddleware already handles upsert — we just return the profile.
router.post("/verify", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id:               true,
        displayName:      true,
        email:            true,
        avatarUrl:        true,
        coinBalance:      true,
        totalRoundsPlayed:true,
        totalRoundsWon:   true,
        doubleWins:       true,
        isGuest:          true,
        createdAt:        true,
      },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    console.error("[POST /auth/verify]", err);
    res.status(500).json({ error: "Failed to verify token" });
  }
});

export default router;
