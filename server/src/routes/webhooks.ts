import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { classifyTicket } from "../controllers/ai.controller";

const router = Router();

// Webhook endpoint for creating tickets (for external systems integration)
router.post("/tickets", asyncHandler(async (req, res) => {
  const { title, description, status, priority, category, senderName, senderEmail, assigneeId } = req.body;

  // Basic validation
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!senderName) {
    return res.status(400).json({ error: "Sender name is required" });
  }
  if (!senderEmail) {
    return res.status(400).json({ error: "Sender email is required" });
  }

  // Validate enum values if provided
  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority value" });
  }

  const validCategories = ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category value" });
  }

  // Create the ticket
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description: description || null,
      status: status || "OPEN",
      priority: priority || "MEDIUM",
      category: category || null,
      senderName,
      senderEmail,
      assigneeId: assigneeId || null,
      // Note: Not setting reporterId here as webhook tickets may not have an authenticated user
      // This could be adjusted based on requirements
    },
  });

  // Fire off AI classification in the background (do not await)
// This ensures ticket creation is not blocked by AI processing
  classifyTicket(title, description)
    .then(({ category, priority }) => {
      // Update the ticket with the classified category and priority
      // Need to cast to proper types for Prisma
      return prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          category: category as any,
          priority: priority as any
        },
      });
    })
    .then(() => {
      console.log(`AI classification completed for webhook ticket ${ticket.id}`);
    })
    .catch((error) => {
      console.error(`AI classification failed for webhook ticket ${ticket.id}`, error);
      // Don't fail the request if AI classification fails
    });

  // Return the ticket immediately without waiting for AI classification
  res.status(201).json(ticket);
}));

export default router;