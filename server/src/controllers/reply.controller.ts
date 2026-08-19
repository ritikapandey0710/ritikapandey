import { prisma } from "../lib/prisma";

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


