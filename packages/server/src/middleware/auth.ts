import { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../lib/firebase";
import { prisma } from "../lib/prisma";

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
