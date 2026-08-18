import { prisma } from './prisma';

// Placeholder for summarizeTicket function - to be implemented
export async function summarizeTicket(_req: any, res: any) {
  // TODO: Implement ticket summarization using AI
  return res.status(501).json({ error: "Ticket summarization not implemented yet" });
}

// Reply Form "Polish" feature using the Google Gemini API (free tier).
//
// IMPORTANT: The Gemini API key is read from the server environment variable
// `GEMINI_API_KEY` and is used ONLY on the server when calling Google's
// generateContent endpoint. It is never sent to, embedded in, or returned to
// the React client. The client only talks to the `/api/ai/polish` endpoint.

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
          maxOutputTokens: 1024,
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