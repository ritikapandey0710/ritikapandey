import { Router } from "express";
import { prisma } from "../../prisma";
import { authenticate, authenticateAndAuthorizeAdmin } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { auth } from "../../auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "../../types/role";
import { handleZodError } from "../../utils/validation";

const router = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]).optional(),
  role: z.enum([Role.ADMIN, Role.AGENT]).optional(),
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
      where: { deletedAt: null },
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
 */
router.post(
  "/",
  authenticateAndAuthorizeAdmin,
  asyncHandler(async (req, res) => {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(handleZodError(parseResult));
    }

    const { name, email, password } = parseResult.data;

    const result = await auth.api.signUpEmail({
      body: { email, password, name: name.trim() },
    });

    if (!result || !result.user) {
      throw new Error("Failed to create user");
    }

    const { user } = result;
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  })
);

/**
 * PATCH /api/users/:id
 * Update a user (admin only)
 */
router.patch(
  "/:id",
  authenticateAndAuthorizeAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(handleZodError(parseResult));
    }

    const { name, email, password, role } = parseResult.data;

    // Check user exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (password && password.length >= 8) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({ message: "No changes provided" });
    }

    try {
      // Update user fields in the user table
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData as any,
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });

      // If password changed, update it in the account table too
      if (updateData.password) {
        await prisma.account.updateMany({
          where: { userId: id, providerId: "credential" },
          data: { password: updateData.password as string },
        });
      }

      res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Email already in use" });
      }
      return res.status(500).json({ error: "Failed to update user" });
    }
  })
);

/**
 * DELETE /api/users/:id
 * Soft delete a user (admin only). Cannot delete oneself. Unassigns any tickets assigned to the user.
 */
router.delete(
  "/:id",
  authenticateAndAuthorizeAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if ((req as any).user?.id === id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Ensure user exists and is not already deleted
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }
    if (existing.deletedAt !== null) {
      return res.status(400).json({ error: "User already deleted" });
    }

    // Unassign tickets from this user and soft delete the user in a transaction
    await prisma.$transaction([
      prisma.ticket.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: null },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    res.status(200).json({ message: "User deleted successfully" });
  })
);

export default router;
