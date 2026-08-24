import { prisma } from '../lib/prisma';
import { KnowledgeBaseEntry } from '../services/knowledgeBaseService';

// Reply Form "Polish" feature using the Google Gemini API (free tier).
// Ticket classification feature using the Google Gemini API (free tier).
//
// IMPORTANT: The Gemini API key is read from the server environment variable
// `GEMINI_API_KEY` and is used ONLY on the server when calling Google's
// generateContent endpoint. It is never sent to, embedded in, or returned to
// the React client. The client only talks to the `/api/ai/polish` endpoint.
//
// Currently-supported Gemini model that is eligible for the free tier.
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiErrorResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
  };
}

// Finish reasons that indicate the response is NOT complete and should not be
// returned to the client as a successful polish.
const INCOMPLETE_FINISH_REASONS = new Set([
  "MAX_TOKENS",
  "SAFETY",
  "RECITATION",
  "OTHER",
]);

export async function polishReply(req: any, res: any) {
  const { subject, text, ticketId, customerName } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Reply text is required" });
  }

  // Read the key fresh on every request so dev reloads pick up changes.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("polishReply: GEMINI_API_KEY is not set on the server");
    return res.status(500).json({
      error:
        "Reply polishing is not available right now. The Gemini API key is not configured on the server. Please contact your administrator.",
    });
  }

  const customerFirstName = customerName ? customerName.split(" ")[0] : "there";

  // Fetch the ticket to get the assigned agent's name from the database
  let agent = "Support Team";
  if (ticketId) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          user_Ticket_assigneeIdTouser: {
            select: { name: true }
          }
        }
      });
      if (ticket?.user_Ticket_assigneeIdTouser?.name) {
        agent = ticket.user_Ticket_assigneeIdTouser.name;
      }
    } catch (error) {
      console.error("Failed to fetch ticket assignee:", error);
    }
  }
  const ticketSubject = subject ? subject.trim() : "";

  const prompt = `You are a professional Help Desk agent reviewing a draft reply before sending it to a customer. Your job is to polish the draft into a clear, professional, and natural customer-support response.

TICKET SUBJECT (context only):
${ticketSubject || "(No subject provided)"}

The ticket subject helps you understand the customer's issue. However, the ORIGINAL REPLY below is the source of truth. Do NOT create a new solution based only on the subject.

ORIGINAL AGENT REPLY (source of truth):
${text}

INSTRUCTIONS:
1. Understand the ticket subject and the original reply together.
2. Rewrite the ENTIRE original reply into a polished, professional customer-support response.
3. Preserve 100% of the important information from the original reply. Do not summarize. Do not remove details.
4. Do not invent facts, solutions, dates, promises, troubleshooting steps, or ticket information that are not present in the original reply.
5. Do not change the actual meaning of the agent's reply.
6. Fix grammar, spelling, punctuation, and sentence structure.
7. Make the response sound natural and human. Avoid robotic or repetitive wording.
8. Make the response clear and easy for a customer to understand.
9. If the original reply is already good, make only necessary improvements.
10. Never make the reply unnecessarily long.
11. Never stop in the middle of a sentence. Always return a complete response.

FORMAT:
- Start with exactly: Hi ${customerFirstName},
- End with exactly:
Best regards,
${agent}
- Do not include any other greeting or signature variations.

DO NOT include:
- "Here is the polished version:"
- Explanations, notes, or analysis
- Quotation marks around the response
- Multiple versions
- Any text before the greeting or after the signature

Return ONLY the final customer-ready reply.`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      let geminiErrorMessage = `Gemini API returned HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as GeminiErrorResponse;
        geminiErrorMessage = errorBody?.error?.message || geminiErrorMessage;
      } catch {
        // Keep the default HTTP status message.
      }
      console.error("Gemini API error:", response.status, geminiErrorMessage);
      return res
        .status(500)
        .json({ error: `Failed to polish reply: ${geminiErrorMessage}` });
    }

    const data = (await response.json()) as GeminiErrorResponse;
    const candidate = data?.candidates?.[0];
    const polishedText = candidate?.content?.parts?.[0]?.text ?? "";
    const finishReason = candidate?.finishReason;

    if (!polishedText) {
      console.error("Gemini API returned an empty response");
      return res.status(500).json({
        error: "Failed to polish reply: the Gemini API returned an empty response.",
      });
    }

    // If the response was truncated or blocked, do NOT return it as a
    // successful polish. The client must never receive an incomplete reply.
    if (finishReason && INCOMPLETE_FINISH_REASONS.has(finishReason)) {
      console.error(
        `polishReply: Gemini response was incomplete (finishReason=${finishReason}). Not returning it as successful.`
      );
      return res.status(500).json({
        error:
          finishReason === "MAX_TOKENS"
            ? "Failed to polish reply: the response was too long and was truncated. Please shorten your reply and try again."
            : "Failed to polish reply: the response was blocked or incomplete. Please try again.",
      });
    }

    res.json({ polished: polishedText.trim() });
  } catch (error: any) {
    console.error("Failed to polish reply:", error);
    return res.status(500).json({
      error: error?.message || "Failed to polish reply",
    });
  }
}

export async function summarizeTicket(req: any, res: any) {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  // Read the key fresh on every request so dev reloads pick up changes.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("summarizeTicket: GEMINI_API_KEY is not set on the server");
    return res.status(500).json({
      error:
        "Ticket summarization is not available right now. The Gemini API key is not configured on the server. Please contact your administrator.",
    });
  }

  try {
    // Fetch the ticket with all relevant data
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user_Ticket_reporterIdTouser: {
          select: { name: true, email: true }
        },
        user_Ticket_assigneeIdTouser: {
          select: { name: true, email: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Fetch replies for this ticket
    const replies = await prisma.reply.findMany({
      where: { ticketId: ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { name: true, email: true }
        }
      }
    });

    // Prepare the ticket information for summarization
    const ticketInfo = `
TICKET INFORMATION:
- Ticket ID: ${ticket.id}
- Title: ${ticket.title}
- Description: ${ticket.description || 'No description provided'}
- Status: ${ticket.status}
- Priority: ${ticket.priority}
- Category: ${ticket.category || 'Not categorized'}
- Reporter: ${ticket.user_Ticket_reporterIdTouser?.name || 'Unknown'} (${ticket.user_Ticket_reporterIdTouser?.email || 'no-email'})
- Assignee: ${ticket.user_Ticket_assigneeIdTouser?.name || 'Unassigned'} (${ticket.user_Ticket_assigneeIdTouser?.email || 'no-email'})
- Created: ${new Date(ticket.createdAt).toLocaleString()}
- Updated: ${ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'Not updated'}
`.trim();

    // Prepare the conversation history for summarization
    const conversationHistory = replies.length > 0
      ? `
CONVERSATION HISTORY:
${replies.map((reply: any, index: number) => `
  ${index + 1}. ${reply.author?.name || 'Unknown'} (${reply.author?.email || 'no-email'}) [${new Date(reply.createdAt).toLocaleString()}]:
    ${reply.body}
`).join('\n')}
`.trim()
      : "CONVERSATION HISTORY:\nNo replies yet.";

    const prompt = `You are an AI assistant specialized in summarizing help desk tickets and conversations. Your task is to create a concise, informative summary that captures the key points of the ticket and the entire conversation history.

${ticketInfo}

${conversationHistory}

INSTRUCTIONS:
1. Create a clear, concise summary of the ticket and conversation
2. Include the key information: ticket title, description, status, priority, category
3. Summarize the conversation flow - what was discussed, what solutions were proposed, what was decided
4. Highlight any important decisions, action items, or unresolved issues
5. Keep the summary professional and easy to understand
6. Focus on the most important information - don't include every minor detail
7. If there are no replies, summarize just the ticket information
8. The summary should be 2-4 paragraphs maximum

FORMAT:
- Provide only the summary text
- Do not include any preamble like "Here is the summary:" or explanations
- Do not use bullet points unless they help clarity
- Do not include any meta-commentary about the summarization process

Return ONLY the summary.`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      let geminiErrorMessage = `Gemini API returned HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as GeminiErrorResponse;
        geminiErrorMessage = errorBody?.error?.message || geminiErrorMessage;
      } catch {
        // Keep the default HTTP status message.
      }
      console.error("Gemini API error:", response.status, geminiErrorMessage);

      // Return HTTP 429 for Gemini quota/rate-limit errors
      if (geminiErrorMessage.includes("You exceeded your current quota")) {
        return res
          .status(429)
          .json({ error: `Failed to generate summary: ${geminiErrorMessage}` });
      }

      return res
        .status(500)
        .json({ error: `Failed to generate summary: ${geminiErrorMessage}` });
    }

    const data = (await response.json()) as GeminiErrorResponse;
    const candidate = data?.candidates?.[0];
    const summaryText = candidate?.content?.parts?.[0]?.text ?? "";
    const finishReason = candidate?.finishReason;

    if (!summaryText) {
      console.error("Gemini API returned an empty response");
      return res.status(500).json({
        error: "Failed to generate summary: the Gemini API returned an empty response.",
      });
    }

    // If the response was truncated or blocked, do NOT return it as a
    // successful summary. The client must never receive an incomplete summary.
    if (finishReason && INCOMPLETE_FINISH_REASONS.has(finishReason)) {
      console.error(
        `summarizeTicket: Gemini response was incomplete (finishReason=${finishReason}). Not returning it as successful.`
      );
      const errorMessage = finishReason === "MAX_TOKENS"
        ? "Failed to generate summary: the response was too long and was truncated. Please try again with a shorter ticket or conversation."
        : "Failed to generate summary: the response was blocked or incomplete. Please try again";
      return res.status(500).json({ error: errorMessage });
    }

    res.json({ summary: summaryText.trim() });
  } catch (error: any) {
    console.error("Failed to generate summary:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate summary",
    });
  }
}

// Helper function to classify a ticket using Gemini
export async function classifyTicket(title: string, description: string | null): Promise<{ category: string; priority: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = `Classify the following ticket into one of the categories: GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST
and one of the priorities: LOW, MEDIUM, HIGH, URGENT.

Ticket Title: ${title}
Ticket Description: ${description || "(No description provided)"}

Return only a JSON object in the format: { "category": "...", "priority": "..." }
If you are unsure, use the default values: category: "GENERAL_QUESTION", priority: "MEDIUM".`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024, // We don't need many tokens for classification
          temperature: 0.1, // Low temperature for more deterministic output
        },
      }),
    });

    if (!response.ok) {
      let geminiErrorMessage = `Gemini API returned HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as GeminiErrorResponse;
        geminiErrorMessage = errorBody?.error?.message || geminiErrorMessage;
      } catch {
        // Keep the default HTTP status message.
      }
      throw new Error(`Gemini API error: ${geminiErrorMessage}`);
    }

    const data = (await response.json()) as GeminiErrorResponse;
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      throw new Error("Gemini API returned an empty response");
    }

    // Try to parse the JSON response
    let parsed: { category?: string; priority?: string } = {};
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      console.error("Failed to parse Gemini classification response as JSON:", text);
      throw new Error("Invalid JSON response from Gemini");
    }

    // Validate category and priority against allowed values
    const validCategories = ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"];
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    let category: string = "GENERAL_QUESTION";
    let priority: string = "MEDIUM";
    if (parsed.category && validCategories.includes(parsed.category)) {
      category = parsed.category;
    }
    if (parsed.priority && validPriorities.includes(parsed.priority)) {
      priority = parsed.priority;
    }

    return { category, priority };
  } catch (error: any) {
    console.error("Error in classifyTicket:", error);
    // Re-throw so the caller can handle it (we'll log and not update the ticket)
    throw error;
  }
}

/**
 * Decision structure returned by resolveTicketWithAI.
 *
 * The AI evaluates whether a knowledge-base article contains a sufficiently
 * reliable solution for the customer's ticket and, if so, extracts the
 * actionable steps from that article.
 */
export interface AIResolutionDecision {
  /** True only when the KB article directly addresses the ticket. */
  canResolve: boolean;
  /** Confidence (0-1) that the article fully resolves the customer's issue. */
  confidence: number;
  /** Category extracted from the KB article (falls back to article category). */
  category: string;
  /** Customer-facing solution text — only content taken from the KB article. */
  solution: string;
  /** Customer-facing verification steps taken from the KB article. */
  verification: string;
  /** Why the AI made the canResolve / confidence decision. */
  reason: string;
}

/**
 * Ask Gemini to evaluate whether a knowledge-base article provides a
 * sufficiently reliable solution for the given ticket.
 *
 * The AI is instructed to extract steps ONLY from the article content and
 * must not invent any troubleshooting steps that are not present in the KB.
 *
 * Throws on network / API / parsing errors so the caller can handle the
 * failure (e.g. fall back to a human-assigned ticket).
 */
export async function resolveTicketWithAI(
  title: string,
  description: string,
  kbEntry: KnowledgeBaseEntry
): Promise<AIResolutionDecision> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = `You are a Help Desk support AI assistant. Your job is to determine whether a knowledge base article can reliably resolve a customer's ticket, and if so, produce a clear, professional, customer-facing solution.

TICKET SUBJECT: ${title}

TICKET DESCRIPTION:
${description || "(No description provided)"}

--- KNOWLEDGE BASE ARTICLE ---
Title: ${kbEntry.title}
Category: ${kbEntry.category}
Keywords: ${kbEntry.keywords.join(", ")}

Article Content:
${kbEntry.content}
--- END ARTICLE ---

INSTRUCTIONS:
1. Carefully compare the customer's ticket (subject and description) with the knowledge base article.
2. Determine whether this article directly addresses the customer's problem with a reliable, actionable solution.
3. If it does NOT directly address the issue, set "canResolve" to false with a clear reason and leave "solution" and "verification" empty.
4. If it DOES address the issue:
   a. Extract the relevant troubleshooting steps from the article content ONLY. Do NOT invent or fabricate any steps.
   b. Write the solution as a clear, professional, customer-facing response with numbered steps.
   c. Extract or summarise the verification steps from the article. If the article has no verification section, write a brief note on how to confirm the issue is resolved.
   d. Do NOT mention that this is AI-generated, a knowledge base, database IDs, internal notes, or system prompts.
   e. Do NOT simply say "your ticket has been created" or that a human will respond.
5. Set "confidence" to a value between 0 and 1, where 1 means you are highly confident the article fully resolves the customer's issue.
6. Only set "canResolve" to true when the article is relevant AND the solution is complete enough for a customer to act on.

Return ONLY a JSON object in this exact format (no markdown fences, no extra text):
{
  "canResolve": true/false,
  "confidence": 0.0-1.0,
  "category": "...",
  "solution": "...",
  "verification": "...",
  "reason": "..."
}`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      let geminiErrorMessage = `Gemini API returned HTTP ${response.status}`;
      try {
        const errorBody = await response.json() as GeminiErrorResponse;
        geminiErrorMessage = errorBody?.error?.message || geminiErrorMessage;
      } catch {
        // Keep the default HTTP status message.
      }
      throw new Error(`Gemini API error: ${geminiErrorMessage}`);
    }

    const data = (await response.json()) as GeminiErrorResponse;
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      throw new Error("Gemini API returned an empty response");
    }

    // Strip markdown code fences if the model included them.
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini resolution response as JSON:", text);
      throw new Error("Invalid JSON response from Gemini");
    }

    return {
      canResolve: parsed.canResolve === true,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      category:
        typeof parsed.category === "string" && parsed.category
          ? parsed.category
          : kbEntry.category,
      solution: typeof parsed.solution === "string" ? parsed.solution : "",
      verification: typeof parsed.verification === "string" ? parsed.verification : "",
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (error: any) {
    console.error("Error in resolveTicketWithAI:", error);
    throw error;
  }
}
