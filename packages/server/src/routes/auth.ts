import { Router, Request, Response } from "express";
import admin from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

// =============================================================================
// routes/auth.ts  —  POST /auth/guest, POST /auth/verify
//
// Java analogy: @RestController with @RequestMapping("/auth")
// =============================================================================

const router = Router();

// ── POST /auth/guest ──────────────────────────────────────────────────────────
// Creates a guest account (no prior Firebase login required).
// Flow:
//   1. Create anonymous Firebase Auth user via Admin SDK
//   2. Upsert a Prisma User marked isGuest=true
//   3. Return a Firebase custom token — client calls signInWithCustomToken()
//      to get a real ID token for all subsequent requests.
//
// Java analogy: like issuing a JWT for an unauthenticated "trial" session.
router.post("/guest", async (_req: Request, res: Response): Promise<void> => {
  try {
    const suffix   = Math.random().toString(36).substring(2, 7).toUpperCase();
    const guestName = `Guest_${suffix}`;

    // Create an anonymous Firebase user
    const fbUser = await admin.auth().createUser({ displayName: guestName });

    // Create user + welcome bonus atomically — only on first creation
    const existing = await prisma.user.findUnique({ where: { firebaseUid: fbUser.uid } });
    const user = existing ?? await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firebaseUid:  fbUser.uid,
          displayName:  guestName,
          email:        null,
          isGuest:      true,
          coinBalance:  200,
        },
      });
      await tx.coinTransaction.create({
        data: { userId: created.id, amount: 200, type: "WELCOME_BONUS" },
      });
      return created;
    });

    // Custom token lets the client call Firebase signInWithCustomToken()
    const customToken = await admin.auth().createCustomToken(fbUser.uid);

    res.status(201).json({ customToken, userId: user.id, displayName: user.displayName });
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
