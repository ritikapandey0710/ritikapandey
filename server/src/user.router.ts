import { Router } from "express";
import { prisma } from "./prisma";
import { authenticateAndAuthorizeAdmin } from "./middleware/auth.middleware";
import { asyncHandler } from "./utils/asyncHandler";

const router = Router();

/**
 * GET /api/users
 * Returns list of all users (admin only)
 */
router.get(
  "/",
  authenticateAndAuthorizeAdmin,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  })
);

export default router;