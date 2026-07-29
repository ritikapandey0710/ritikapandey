import { Router } from "express";
import { prisma } from "../../prisma";
import { authenticate, authenticateAndAuthorizeAdmin } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { auth } from "../../auth";
import { z } from "zod";

const router = Router();

// Validation schema for user creation
const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * GET /api/users
 * Returns list of all users (authenticated users)
 */
router.get(
  "/",
  authenticate,
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

/**
 * POST /api/users
 * Create a new user (admin only)
 * Expects { name, email, password }
 */
router.post(
  "/",
  authenticateAndAuthorizeAdmin,
  asyncHandler(async (req, res) => {
    // Validate request body with Zod
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      // Return the first error message for simplicity
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name, email, password } = parseResult.data;

    // Use auth.api.signUpEmail to create user and account
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name.trim(),
      },
    });

    if (!result || !result.user) {
      throw new Error("Failed to create user");
    }

    const { user } = result;
    // Return user info without sensitive fields
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  })
);

export default router;