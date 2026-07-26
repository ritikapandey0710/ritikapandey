import { prisma } from "./prisma";

const assigneeInclude = {
  assignee: { select: { id: true, name: true, email: true } },
};

export async function getTickets(req: any, res: any) {
  try {
    const { search, status, priority } = req.query;
    const where: any = {};

    // If not admin, only show user's own tickets
    if (req.user?.role !== "ADMIN") {
      where.OR = [
        { reporterId: req.user.id },
        { assigneeId: req.user.id }
      ];
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      include: assigneeInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
}

export async function getTicketById(req: any, res: any) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: assigneeInclude,
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    // Check if user has access to this ticket (unless they're admin)
    if (req.user?.role !== "ADMIN" &&
        ticket.reporterId !== req.user.id &&
        ticket.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
}

export async function createTicket(req: any, res: any) {
  try {
    const { title, description, status, priority, assigneeId, reporterId } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    // Determine the reporter ID
    let finalReporterId = reporterId;
    // If not admin, they can only create tickets for themselves
    if (req.user?.role !== "ADMIN") {
      finalReporterId = req.user.id;
    }
    // If admin didn't specify a reporter, default to themselves
    else if (!reporterId) {
      finalReporterId = req.user.id;
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description: description || null,
        status: status || "OPEN",
        priority: priority || "MEDIUM",
        assigneeId: assigneeId || null,
        reporterId: finalReporterId,
      },
      include: assigneeInclude,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
}

export async function updateTicket(req: any, res: any) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId } = req.body;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    // Check if user has permission to update this ticket
    // Admin can update any ticket, regular users can only update their own
    if (req.user?.role !== "ADMIN" &&
        existing.reporterId !== req.user.id &&
        existing.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    // Additional check: only admins can assign tickets to others
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only admins can assign tickets to other users" });
      }
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;

    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: { assignee: { select: { id: true, name: true } } },
    });

    res.json(ticket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
}

export async function deleteTicket(req: any, res: any) {
  try {
    const { id } = req.params;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    // Check if user has permission to delete this ticket
    // Admin can delete any ticket, regular users can only delete their own
    if (req.user?.role !== "ADMIN" && existing.reporterId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    await prisma.ticket.delete({ where: { id } });
    res.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
}
