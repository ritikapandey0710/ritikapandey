import { prisma } from "../lib/prisma";
import { sendEmailWithRetry } from "../services/resend.service";

/**
 * Best-effort, non-blocking: send the agent reply to the customer via Resend
 * and record the outbound email in EmailMessage for threading with delivery
 * status tracking (QUEUED -> SENT/FAILED). Never throws.
 *
 * Note on messageId: the Resend send API only returns its own opaque email id
 * (no RFC 5322 Message-ID), so while the send is pending we store a clearly
 * marked `pending-outbound-<replyId>` placeholder and replace it with the
 * Resend ID once known. We never invent an RFC Message-ID.
 */
async function sendAgentReplyEmail(params: {
  ticketId: string;
  replyId: string;
  ticketTitle: string;
  senderEmail: string;
  replyBody: string;
}): Promise<void> {
  const { ticketId, replyId, ticketTitle, senderEmail, replyBody } = params;

  try {
    if (!senderEmail || !senderEmail.trim()) {
      console.log(`Skipping reply email for ticket ${ticketId}: no customer email`);
      return;
    }

    // Fetch latest EmailMessage for threading headers (best-effort)
    const lastEmail = await prisma.emailMessage.findFirst({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });

    const headers: Record<string, string> = {};
    if (lastEmail?.messageId) {
      const wrapped = `<${lastEmail.messageId}>`;
      headers["In-Reply-To"] = wrapped;
      headers["References"] = lastEmail.references
        ? `${lastEmail.references} ${wrapped}`
        : wrapped;
    }

    const escapedBody = replyBody
      .replace(/\u0026/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;");

    // Convert newlines to <br/> without embedding raw newlines in literals
    const nl = String.fromCharCode(10);
    const bodyHtml = escapedBody.split(nl).join("<br/>");

    const html = [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">',
      '<h2 style="color: #1a56db; margin-bottom: 8px;">Help Desk</h2>',
      `<p style="color: #333; font-size: 15px; line-height: 1.6;">${bodyHtml}</p>`,
      "</div>",
    ].join(nl);

    const subject = `Re: ${ticketTitle}`;

    // Record the outbound email as QUEUED before sending. The unique
    // messageId constraint is satisfied with a pending placeholder that is
    // replaced by the Resend email ID after a successful send. Duplicate-safe:
    // if a row already exists (e.g. retried flow), reuse it instead of failing.
    // A full send snapshot (toAddress/subject/bodyHtml) is stored so the
    // Phase 5 delivery worker can re-send without depending on ticket data.
    const pendingMessageId = `pending-outbound-${replyId}`;
    let outboundRowId: string | null = null;
    try {
      const existing = await prisma.emailMessage.findUnique({
        where: { messageId: pendingMessageId },
        select: { id: true },
      });
      if (existing) {
        outboundRowId = existing.id;
      } else {
        const queued = await prisma.emailMessage.create({
          data: {
            messageId: pendingMessageId,
            inReplyTo: headers["In-Reply-To"],
            references: headers["References"],
            ticketId,
            replyId,
            direction: "OUTBOUND",
            deliveryStatus: "QUEUED",
            toAddress: senderEmail.trim(),
            subject,
            bodyHtml: html,
          },
        });
        outboundRowId = queued.id;
      }
    } catch (error) {
      // Tracking is best-effort; sending proceeds even if the QUEUED row
      // could not be created.
      console.error(
        `Failed to record QUEUED outbound EmailMessage ticketId=${ticketId} replyId=${replyId}:`,
        error
      );
    }

    const result = await sendEmailWithRetry(
      senderEmail,
      subject,
      html,
      Object.keys(headers).length > 0 ? headers : undefined
    );

    if (!result.emailId) {
      console.error(
        `Failed to send reply email (Resend unavailable or failed) ticketId=${ticketId} replyId=${replyId}: ${result.error ?? "unknown error"}`
      );
      // Mark the tracked row FAILED so delivery state is observable.
      if (outboundRowId) {
        await prisma.emailMessage
          .update({
            where: { id: outboundRowId },
            data: {
              deliveryStatus: "FAILED",
              lastError: result.error ?? "Resend unavailable or failed",
              retryCount: result.attempts,
            },
          })
          .catch((err) =>
            console.error(
              `Failed to mark outbound EmailMessage FAILED ticketId=${ticketId} replyId=${replyId}:`,
              err
            )
          );
      }
      return;
    }

    // Update the tracked row to SENT and store the real Resend email ID.
    try {
      await prisma.emailMessage.update({
        where: { id: outboundRowId! },
        data: {
          messageId: result.emailId,
          deliveryStatus: "SENT",
          lastError: null,
          retryCount: result.attempts,
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2002") {
        console.error(
          `Failed to update outbound EmailMessage to SENT ticketId=${ticketId} replyId=${replyId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      `Error sending reply email ticketId=${ticketId} replyId=${replyId}:`,
      error
    );
  }
}

export async function createReply(req: any, res: any) {
  const { body } = req.body;
  const ticketId = req.params.id;

  // Get the current user from the request (set by auth middleware)
  const user = (req as any).user;
  const userId = user?.id;

  if (!body || body.trim() === "") {
    return res.status(400).json({ error: "Reply body is required" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verify the ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  // Determine sender type based on user role
  const senderType = user?.role === 'AGENT' || user?.role === 'ADMIN' ? 'AGENT' : 'CUSTOMER';

  try {
    const reply = await prisma.reply.create({
      data: {
        body: body.trim(),
        ticketId: ticketId,
        authorId: userId,
        senderType,
      },
    });

    // Update the ticket's updatedAt timestamp
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Best-effort, non-blocking: email the customer when an AGENT replies.
    // Never fails or rolls back the reply if Resend is unavailable/fails.
    if (senderType === "AGENT") {
      void sendAgentReplyEmail({
        ticketId,
        replyId: reply.id,
        ticketTitle: ticket.title,
        senderEmail: ticket.senderEmail,
        replyBody: body.trim(),
      }).catch((err) =>
        console.error(
          `Unexpected error in reply email flow ticketId=${ticketId} replyId=${reply.id}:`,
          err
        )
      );
    }

    res.status(201).json(reply);
  } catch (error: any) {
    console.error("Error creating reply:", error);
    // Return the error message in the response for debugging
    return res.status(500).json({ error: error.message || "Failed to create reply" });
  }
}

export async function getRepliesByTicketId(req: any, res: any) {
  const ticketId = req.params.id;

  try {
    const replies = await prisma.reply.findMany({
      where: { ticketId: ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc", // Oldest first for conversation view
      },
    });

    res.json(replies);
  } catch (error: any) {
    console.error("Error fetching replies:", error);
    // Return the error message in the response for debugging
    return res.status(500).json({ error: error.message || "Failed to fetch replies" });
  }
}


