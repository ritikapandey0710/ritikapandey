import { prisma } from "../lib/prisma";
import { knowledgeBaseService } from "../services/knowledgeBaseService";
import { getOrCreateAIAgent } from "../services/aiAgentService";
import { EmailService } from "./email.service";

export interface ProcessNewTicketInput {
  title: string;
  description?: string | null;
  priority?: string | null;
  category?: string | null;
  senderName: string;
  senderEmail: string;
  /** Authenticated user id (reporter), if available */
  reporterId?: string | null;
  /** Preferred assignee if AI agent is unavailable */
  fallbackAssigneeId?: string | null;
    /** Send the "ticket created" notification email to the sender */
  sendCreatedNotification?: boolean;
  /**
   * When true, skips the knowledge-base auto-resolution section so that the
   * caller (e.g. sendAutoResponse in the email-ingestion path) can perform
   * AI-verified, email-aware resolution and avoid marking the ticket RESOLVED
   * before the customer's solution email has been sent.
   *
   * API and webhook callers leave this undefined (false) so that the existing
   * KB auto-resolution behaviour is preserved for those entry points.
   */
  skipAutoResolve?: boolean;
}

/**
 * Shared ticket-processing pipeline used by ALL ticket creation entry points
 * (API POST /api/tickets, webhooks, and Gmail/IMAP ingestion).
 *
 * Flow:
 *   create ticket (NEW, assigned to AI agent)
 *   → mark PROCESSING
 *   → Knowledge Base check (auto-resolve if matched)
 *   → AI classification in background (category + priority)
 *   → on AI failure: reset to OPEN + unassign
 */
export async function processNewTicket(input: ProcessNewTicketInput) {
  const {
    title,
    description,
    priority,
    category,
    senderName,
    senderEmail,
    reporterId,
    fallbackAssigneeId,
    sendCreatedNotification = false,
    skipAutoResolve = false,
  } = input;

  // Find or create the AI agent to assign this ticket to
  let aiAgentId: string | null = null;
  try {
    const aiAgent = await getOrCreateAIAgent();
    aiAgentId = aiAgent.id;
  } catch (aiAgentError) {
    console.error(`Failed to get/create AI agent for ticket:`, aiAgentError);
  }

  // Create ticket with initial status NEW, assigned to AI agent
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description: description || null,
      status: "NEW", // Always start as NEW
      priority: (priority || "MEDIUM") as any,
      category: (category || null) as any, // Optional, no default value
      senderName,
      senderEmail,
      assigneeId: aiAgentId || fallbackAssigneeId || null, // Assign to AI agent first
      reporterId: reporterId || null, // Set to current user if available
    },
  });

  // Optional "ticket created" email notification to the sender.
  // Non-blocking (fire-and-forget): never fails or delays ticket creation.
  if (sendCreatedNotification) {
    EmailService.sendTicketCreatedNotification({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      senderEmail: ticket.senderEmail,
    }).catch((err) => {
      console.error("Ticket-created email notification failed:", err);
    });
  }

  // Mark ticket as PROCESSING (AI is now working on it)
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "PROCESSING" },
  });

    // Check knowledge base for auto-resolution
  // Skip when the caller (e.g. email sendAutoResponse) wants to perform
  // AI-verified, email-aware resolution itself, so the ticket is not marked
  // RESOLVED before the customer's solution email is sent.
    if (!skipAutoResolve) {
    try {
      const kbEntry = knowledgeBaseService.findMatchingEntry(title, description || "");
      if (kbEntry) {
      // Auto-resolve the ticket - keep assigned to AI, mark as AI-resolved
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
          resolvedByAI: true,
          resolvedAt: new Date(),
        },
      });

      // Add a resolution reply
      const resolutionText = knowledgeBaseService.getResolutionSteps(kbEntry);
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
      return ticket; // Skip AI classification
    }

    // If no knowledge base match, ticket remains open for human handling
    // (AI tried via knowledge base but couldn't auto-resolve)
    // Unassign from AI agent so a human agent can pick it up
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "OPEN",
        assigneeId: null, // Unassign from AI agent
      },
    });
      } catch (kbError) {
    console.error(`Knowledge base check failed for ticket ${ticket.id}:`, kbError);
    // Even if knowledge base check fails, mark as open for human handling
    // and unassign from AI agent
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "OPEN",
        assigneeId: null, // Unassign from AI agent
      },
    });
    }
    } else {
      // skipAutoResolve is true — KB resolution is deferred to the email
      // sendAutoResponse flow (AI-verified, email-aware resolution).
      // Set ticket to OPEN so it is visible to agents and ready for
      // sendAutoResponse to resolve.
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "OPEN",
          assigneeId: null,
        },
      });
    }

  // Fire off AI classification in the background (do not await)
  const { classifyTicket } = await import('../controllers/ai.controller');
  classifyTicket(title, description || "")
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
      console.log(`AI classification completed for ticket ${ticket.id}`);
    })
    .catch((error) => {
      // Log the original AI text-generation error for debugging
      console.error(`AI classification failed for ticket ${ticket.id}`, error);
      // If the AI text generation threw, do not leave the ticket stuck in its
      // processing/AI state. Reset ONLY the status to OPEN and unassign from AI
      // (all other fields are left untouched) so it is visible to human agents.
      // Guard against overriding a ticket that was already RESOLVED by the
      // AI-powered email auto-response flow (sendAutoResponse).
      prisma.ticket.update({
        where: { id: ticket.id, status: { not: "RESOLVED" } },
        data: {
          status: "OPEN",
          assigneeId: null, // Unassign from AI agent
        },
      }).catch((statusUpdateError: any) => {
        // P2025 = record not found (the ticket was already RESOLVED, so our
        // guard clause correctly prevented the update). Silence this; any
        // other error is unexpected and worth logging.
        if (statusUpdateError?.code !== "P2025") {
          console.error(`Failed to reset ticket ${ticket.id} status to OPEN after AI classification failure:`, statusUpdateError);
        }
      });
    });

  return ticket;
}