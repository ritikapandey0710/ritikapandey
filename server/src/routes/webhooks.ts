import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { knowledgeBaseService } from "../services/knowledgeBaseService";

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

  // Create ticket with initial status NEW
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description: description || null,
      status: "NEW", // Always start as NEW
      priority: priority || "MEDIUM",
      category: category || null, // Optional, no default value
      senderName,
      senderEmail,
      assigneeId: assigneeId || null, // Optional
      reporterId: userId || null, // Set to current user if available
    },
  });

  // Mark ticket as PROCESSING (AI is now working on it)
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "PROCESSING" },
  });

  // Check knowledge base for auto-resolution
  try {
    const kbEntry = knowledgeBaseService.findMatchingEntry(title, description);
    if (kbEntry) {
      // Auto-resolve the ticket
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
        },
      });

      // Add a resolution reply
      const resolutionText = knowledgeBaseService.getResolutionSteps(kbEntry);
      // Determine the author for the resolution reply.
      // For authenticated requests, use the reporter; for unauthenticated
      // webhook requests (no reporter), fall back to a system/bot user so
      // the resolution is recorded as an AGENT reply in the conversation thread.
      let replyAuthorId = ticket.reporterId;
      if (!replyAuthorId) {
        const botUser = await prisma.user.findUnique({
          where: { email: 'system@helpdesk.local' }
        });
        if (botUser) {
          replyAuthorId = botUser.id;
        }
      }
      if (replyAuthorId) {
        await prisma.reply.create({
          data: {
            body: resolutionText,
            ticketId: ticket.id,
            authorId: replyAuthorId,
            senderType: "AGENT"
          }
        });
      }

      console.log(`Ticket ${ticket.id} auto-resolved using knowledge base: ${kbEntry.title}`);
      // Fetch the updated ticket to return accurate status
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id }
      });
      res.status(201).json(updatedTicket);
      return; // Skip AI classification and normal response
    }

    // If no knowledge base match, ticket remains open for human handling
    // (AI tried via knowledge base but couldn't auto-resolve)
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "OPEN",
      },
    });
  } catch (kbError) {
    console.error(`Knowledge base check failed for ticket ${ticket.id}:`, kbError);
    // Even if knowledge base check fails, mark as open for human handling
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "OPEN",
      },
    });
  }

  // Fire off AI classification in the background (do not await)
  // Import the classifyTicket function from ai.controller
  const { classifyTicket } = await import('../controllers/ai.controller');
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
      // Log the original AI text-generation error for debugging
      console.error(`AI classification failed for webhook ticket ${ticket.id}`, error);
      // If the AI text generation threw, do not leave the ticket stuck in its
      // processing/AI state. Reset ONLY the status to OPEN (all other fields
      // are left untouched) so it is visible to human agents.
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      }).catch((statusUpdateError) => {
        console.error(`Failed to reset webhook ticket ${ticket.id} status to OPEN after AI classification failure:`, statusUpdateError);
      });
    });

  // Return the ticket immediately without waiting for AI classification
  res.status(201).json(ticket);
}));

export default router;