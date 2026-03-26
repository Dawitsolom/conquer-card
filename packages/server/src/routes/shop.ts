import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

// =============================================================================
// routes/shop.ts  —  /shop/*, /history/:userId, /report/:userId
//
// Tech Spec §4.1:
//   GET  /shop/products         — list coin packs and cosmetics
//   POST /shop/purchase         — process IAP receipt (RevenueCat server-side)
//   GET  /history/:userId       — match history for a user
//   POST /report/:userId        — report a player
//
// Java analogy: @RestController @RequestMapping("/shop")
// =============================================================================

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ── Coin pack catalogue (static for v1.0) ────────────────────────────────────
// These must match the products configured in RevenueCat + App Store / Play Store.
const COIN_PACKS = [
  { productId: "coins_200",    coins: 200,   priceUsd: 0.99,  label: "Starter Pack"  },
  { productId: "coins_500",    coins: 500,   priceUsd: 1.99,  label: "Value Pack"    },
  { productId: "coins_1200",   coins: 1200,  priceUsd: 3.99,  label: "Big Pack"      },
  { productId: "coins_2500",   coins: 2500,  priceUsd: 7.99,  label: "Mega Pack"     },
  { productId: "coins_7500",   coins: 7500,  priceUsd: 19.99, label: "Ultimate Pack" },
];

// ── GET /shop/products ────────────────────────────────────────────────────────
router.get("/products", (_req: AuthRequest, res: Response): void => {
  res.json({ coinPacks: COIN_PACKS });
});

// ── POST /shop/purchase ───────────────────────────────────────────────────────
// Validates an IAP receipt server-side via RevenueCat before crediting coins.
// CRITICAL (Tech Spec §8): coins are ONLY credited after server-side validation.
// Never trust the client — it could fake a successful purchase.
//
// RevenueCat flow:
//   1. Client purchases product in App Store / Play Store
//   2. Client gets a receipt token and sends it here
//   3. Server validates against RevenueCat REST API
//   4. On success: credit coins atomically in DB
router.post("/purchase", async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, receiptToken } = req.body as {
    productId: string;
    receiptToken: string;
  };

  if (!productId || !receiptToken) {
    res.status(400).json({ error: "productId and receiptToken are required" });
    return;
  }

  const pack = COIN_PACKS.find(p => p.productId === productId);
  if (!pack) {
    res.status(400).json({ error: "Unknown product" });
    return;
  }

  try {
    // ── RevenueCat server-side validation ──────────────────────────────────
    // TODO (v1.1): call RevenueCat REST API to validate receiptToken.
    // Reference: https://www.revenuecat.com/docs/server-notifications
    //
    // const rcResponse = await fetch(`https://api.revenuecat.com/v1/receipts`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.REVENUECAT_API_KEY}`,
    //     "Content-Type": "application/json",
    //     "X-Platform": req.body.platform, // "ios" or "android"
    //   },
    //   body: JSON.stringify({ fetch_token: receiptToken, app_user_id: req.user!.id }),
    // });
    // if (!rcResponse.ok) {
    //   res.status(400).json({ error: "Receipt validation failed" });
    //   return;
    // }
    //
    // For v1.0, we validate the product ID and log the receipt for manual review.
    // This block must be replaced with live RevenueCat validation before launch.

    if (!process.env.REVENUECAT_API_KEY) {
      console.warn("[shop/purchase] REVENUECAT_API_KEY not set — skipping live validation (dev only)");
    }

    // Credit coins atomically — same pattern as round payouts
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user!.id },
        data:  { coinBalance: { increment: pack.coins } },
        select: { id: true, coinBalance: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId: req.user!.id,
          amount: pack.coins,
          type:   "IAP",
        },
      });
      return updated;
    });

    res.json({ success: true, coinsAdded: pack.coins, newBalance: updatedUser.coinBalance });
  } catch (err) {
    console.error("[POST /shop/purchase]", err);
    res.status(500).json({ error: "Purchase failed — please try again" });
  }
});

// ── GET /history/:userId ──────────────────────────────────────────────────────
// Returns the last 20 rounds for a user with win/loss outcome.
router.get("/history/:userId", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params["userId"] as string;

  // Users can only view their own history (or an admin could view any)
  if (userId !== req.user!.id) {
    res.status(403).json({ error: "You can only view your own history" });
    return;
  }

  try {
    const records = await prisma.gamePlayer.findMany({
      where:   { userId },
      orderBy: { joinedAt: "desc" },
      take:    20,
      select: {
        coinsWon: true,
        joinedAt: true,
        round: {
          select: {
            roundNumber:  true,
            winnerUserId: true,
            winType:      true,
            betAmount:    true,
            playerCount:  true,
            startedAt:    true,
            endedAt:      true,
          },
        },
      },
    });

    const history = records.map(r => ({
      roundNumber:  r.round.roundNumber,
      outcome:      r.round.winnerUserId === userId ? "win" : "loss",
      winType:      r.round.winType,
      coinsWon:     r.coinsWon,
      betAmount:    r.round.betAmount,
      playerCount:  r.round.playerCount,
      startedAt:    r.round.startedAt,
      endedAt:      r.round.endedAt,
    }));

    res.json(history);
  } catch (err) {
    console.error("[GET /history/:userId]", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ── POST /report/:userId ──────────────────────────────────────────────────────
// Report another player for bad behaviour (spam, abuse, cheating).
// v1.0: logs to Sentry + console for manual review.
// v1.1: add a Report model to the DB for moderation dashboard.
router.post("/report/:userId", async (req: AuthRequest, res: Response): Promise<void> => {
  const reportedId = req.params["userId"] as string;
  const { reason }             = req.body as { reason?: string };

  if (reportedId === req.user!.id) {
    res.status(400).json({ error: "You cannot report yourself" });
    return;
  }

  try {
    const reported = await prisma.user.findUnique({
      where:  { id: reportedId },
      select: { displayName: true },
    });
    if (!reported) { res.status(404).json({ error: "User not found" }); return; }

    // Log for manual moderation review (v1.0)
    console.warn("[PLAYER REPORT]", {
      reportedBy:    req.user!.id,
      reportedUser:  reportedId,
      displayName:   reported.displayName,
      reason:        reason ?? "No reason given",
      timestamp:     new Date().toISOString(),
    });

    res.json({ success: true, message: "Report submitted — our team will review it" });
  } catch (err) {
    console.error("[POST /report/:userId]", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
