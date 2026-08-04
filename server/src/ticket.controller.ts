import { prisma } from "./prisma";

export async function getTickets(req: any, res: any) {
  const { search, status, sortBy, sortOrder } = req.query;
  console.log(`getTickets: sortBy=${sortBy}, sortOrder=${sortOrder}`); // Debug log
  const where: any = {};

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

  // For now, we'll show all tickets since we don't have user relationships in the Ticket model
  // In a real app, you might want to filter by user ownership or implement a different auth system

  if (search && typeof search === "string") {
    const searchFilter = {
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
      ],
    };
    where.AND = where.AND ? [...where.AND, searchFilter] : [searchFilter];
  }
  if (status && validStatuses.includes(status as string)) where.status = status;

  // Validate and apply sorting
  const allowedSortFields = ['id', 'subject', 'status', 'category', 'senderName', 'assignedTo', 'createdAt', 'updatedAt'];
  let orderBy: any = { createdAt: "desc" }; // default sort

  if (sortBy && typeof sortBy === 'string' && allowedSortFields.includes(sortBy)) {
    const order = (sortOrder && typeof sortOrder === 'string' && (sortOrder.toLowerCase() === 'asc' || sortOrder.toLowerCase() === 'desc'))
      ? sortOrder.toLowerCase()
      : 'desc';
    orderBy = { [sortBy]: order };
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy,
  });

  res.json(tickets);
}

export async function getTicketById(req: any, res: any) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  // For now, we'll allow access to any ticket since we don't have ownership tracking
  // In a real app, you would check if the user owns this ticket or has permission

  res.json(ticket);
}

export async function createTicket(req: any, res: any) {
  const { subject, body, bodyHtml, status, category, senderName, senderEmail, assignedTo } = req.body;

  if (!subject) return res.status(400).json({ error: "Subject is required" });
  if (!senderName) return res.status(400).json({ error: "Sender name is required" });
  if (!senderEmail) return res.status(400).json({ error: "Sender email is required" });

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status value" });

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body: body || null,
      bodyHtml: bodyHtml || null,
      status: status || "OPEN",
      category: category || null, // Optional, no default value
      senderName,
      senderEmail,
      assignedTo: assignedTo || null, // Optional
    },
  });

  res.status(201).json(ticket);
}

export async function updateTicket(req: any, res: any) {
  const { id } = req.params;
  const { subject, body, bodyHtml, status, category, senderName, senderEmail, assignedTo } = req.body;

  const existing = await prisma.ticket.findUnique({ where: { id: Number(id) } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  // For now, we'll allow updates to any ticket since we don't have ownership tracking
  // In a real app, you would check if the user owns this ticket or has permission

  const data: any = {};
  if (subject !== undefined) data.subject = subject;
  if (body !== undefined) data.body = body;
  if (bodyHtml !== undefined) data.bodyHtml = bodyHtml;
  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status !== undefined) {
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status value" });
    data.status = status;
  }
  if (category !== undefined) data.category = category;
  if (senderName !== undefined) data.senderName = senderName;
  if (senderEmail !== undefined) data.senderEmail = senderEmail;
  if (assignedTo !== undefined) data.assignedTo = assignedTo;

  const ticket = await prisma.ticket.update({
    where: { id: Number(id) },
    data,
  });

  res.json(ticket);
}

export async function deleteTicket(req: any, res: any) {
  const { id } = req.params;

  const existing = await prisma.ticket.findUnique({ where: { id: Number(id) } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  // For now, we'll allow deletion of any ticket since we don't have ownership tracking
  // In a real app, you would check if the user owns this ticket or has permission

  await prisma.ticket.delete({ where: { id: Number(id) } });
  res.json({ message: "Ticket deleted successfully" });
}