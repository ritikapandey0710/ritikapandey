import { prisma } from "../lib/prisma";
import { processNewTicket } from "../services/ticketProcessing.service";

export async function getTickets(req: any, res: any) {
  const { search, status, category, senderName, assigneeId, priority, sortBy, sortOrder, excludeAiResolved } = req.query;
  console.log(`getTickets: search=${search}, status=${status}, category=${category}, senderName=${senderName}, assigneeId=${assigneeId}, priority=${priority}, sortBy=${sortBy}, sortOrder=${sortOrder}`); // Debug log
  const whereConditions: any[] = [];

  const validStatuses = ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const validCategories = ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"];
  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  if (search && typeof search === "string") {
    const searchFilter = {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    };
    whereConditions.push(searchFilter);
  }
  if (status && typeof status === 'string' && validStatuses.includes(status)) {
    whereConditions.push({ status });
  }
  if (category && typeof category === 'string' && validCategories.includes(category)) {
    whereConditions.push({ category });
  }
  if (priority && typeof priority === 'string' && validPriorities.includes(priority)) {
    whereConditions.push({ priority });
  }
  if (senderName && typeof senderName === 'string') {
    whereConditions.push({ senderName: { contains: senderName, mode: "insensitive" } });
  }
  if (assigneeId && typeof assigneeId === 'string') {
    whereConditions.push({ assigneeId: { contains: assigneeId, mode: "insensitive" } });
  }

  // By default, exclude tickets that are NEW or PROCESSING (being worked on by AI or brand new)
  // This corresponds to the old "excludeAiResolved" behavior but using the new state system
  if (excludeAiResolved !== "false") { // Default to true unless explicitly set to false
    whereConditions.push({
      NOT: {
        status: {
          in: ["NEW", "PROCESSING"]
        }
      }
    });
  }

  // Build the WHERE clause - if we have multiple conditions, use AND; if one, use it directly; if none, use empty object
  const where: any = whereConditions.length > 0
    ? (whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions })
    : {};

  // Validate and apply sorting
  const allowedSortFields = ['id', 'title', 'status', 'category', 'senderName', 'assigneeId', 'priority', 'createdAt', 'updatedAt'];
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
    include: {
      user_Ticket_reporterIdTouser: {
        select: { id: true, name: true, email: true, role: true },
      },
      user_Ticket_assigneeIdTouser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  res.json(tickets);
}

export async function getTicketById(req: any, res: any) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      user_Ticket_reporterIdTouser: {
        select: { id: true, name: true, email: true, role: true },
      },
      user_Ticket_assigneeIdTouser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  res.json(ticket);
}

export async function createTicket(req: any, res: any) {
  const { title, description, status, priority, category, senderName, senderEmail, assigneeId } = req.body;

  if (!title) return res.status(400).json({ error: "Title is required" });
  if (!senderName) return res.status(400).json({ error: "Sender name is required" });
  if (!senderEmail) return res.status(400).json({ error: "Sender email is required" });

  const validStatuses = ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status value" });

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (priority && !validPriorities.includes(priority)) return res.status(400).json({ error: "Invalid priority value" });

  const validCategorie = ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"];
  if (category && !validCategorie.includes(category)) return res.status(400).json({ error: "Invalid category value" });

  // Get the current user from the request (set by auth middleware)
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
    sendCreatedNotification: true,
  });

  res.json(ticket);
}

export async function updateTicket(req: any, res: any) {
  const { id } = req.params;
  const { title, description, status, priority, category, senderName, senderEmail, assigneeId } = req.body;

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) {
    const validStatuses = ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status value" });
    data.status = status;
  }
  if (priority !== undefined) {
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!validPriorities.includes(priority)) return res.status(400).json({ error: "Invalid priority value" });
    data.priority = priority;
  }
  if (category !== undefined) {
    const validCategoriesForUpdate = [null, 'GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'];
    if (!validCategoriesForUpdate.includes(category)) {
      return res.status(400).json({ error: "Invalid category value" });
    }
    data.category = category;
  }
  if (senderName !== undefined) data.senderName = senderName;
  if (senderEmail !== undefined) data.senderEmail = senderEmail;
  if (assigneeId !== undefined) data.assigneeId = assigneeId;

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
  });

  res.json(ticket);
}

export async function deleteTicket(req: any, res: any) {
  const { id } = req.params;

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  await prisma.ticket.delete({ where: { id } });

  res.json({ message: "Ticket deleted successfully" });
}