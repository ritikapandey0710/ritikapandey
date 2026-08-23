import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { processNewTicket } from "../services/ticketProcessing.service";

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

  const validStatuses = ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
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

  // Get the current user from the request (set by auth middleware if applicable)
  const userId = (req as any).user?.id;

  // Shared processing pipeline:
  // create (NEW) → PROCESSING → KB auto-resolve check → background AI classification
  const ticket = await processNewTicket({
    title,
    description,
    priority,
    category,
    senderName,
    senderEmail,
    reporterId: userId,
    fallbackAssigneeId: assigneeId,
  });

  // Return the ticket immediately without waiting for AI classification
  res.status(201).json(ticket);
}));

export default router;