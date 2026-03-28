import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyIdToken } from "../lib/firebase";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme";

export interface AuthRequest extends Request {
  user?: { id: string; firebaseUid: string; displayName: string; email: string | null };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "No token" }); return; }

  // ── Guest path: app-signed JWT (isGuest: true) ────────────────────────────
  // Guest tokens are signed by us, not Firebase, so we verify them first.
  // A guest JWT has { sub, firebaseUid, displayName, isGuest: true }.
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string; firebaseUid: string; displayName: string; isGuest?: boolean;
    };
    if (payload.isGuest) {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) { res.status(401).json({ error: "Guest user not found" }); return; }
      req.user = { id: user.id, firebaseUid: user.firebaseUid, displayName: user.displayName, email: null };
      next();
      return;
    }
  } catch {
    // Not a guest JWT — fall through to Firebase verification
  }

  // ── Registered path: Firebase ID token ───────────────────────────────────
  try {
    const decoded = await verifyIdToken(token);
    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          displayName: decoded.name ?? "Player",
          email: decoded.email ?? null,
        },
      });
    }
    req.user = { id: user.id, firebaseUid: user.firebaseUid, displayName: user.displayName, email: user.email ?? null };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
