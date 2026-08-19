import { Router } from "express";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket
} from "../controllers/ticket.controller";
import {
  createReply,
  getRepliesByTicketId
} from "../controllers/reply.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET all tickets (with optional filtering)
router.get("/", asyncHandler(getTickets));

// GET single ticket by ID
router.get("/:id", asyncHandler(getTicketById));

// POST create new ticket
router.post("/", asyncHandler(createTicket));

// PUT/PATCH update ticket
router.patch("/:id", asyncHandler(updateTicket));

// DELETE ticket
router.delete("/:id", asyncHandler(deleteTicket));

// GET replies for a ticket
router.get("/:id/replies", asyncHandler(getRepliesByTicketId));

// POST create a reply for a ticket
router.post("/:id/replies", asyncHandler(createReply));

export default router;