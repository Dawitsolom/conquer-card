import { Request, Response, NextFunction } from "express";
import admin from "../lib/firebase";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: { id: string; firebaseUid: string; name: string; email: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "No token" }); return; }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({ data: { firebaseUid: decoded.uid, name: decoded.name ?? "Player", email: decoded.email ?? "" } });
    }
    req.user = user;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}
