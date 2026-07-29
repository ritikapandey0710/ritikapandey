import { auth } from "../auth";
import type { Request, Response, NextFunction } from "express";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Attach user info to request for further use if needed
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const authenticateAndAuthorizeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (session.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    // Attach user info to request for further use if needed
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};