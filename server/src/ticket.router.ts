import { Router } from "express";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket
} from "./ticket.controller";
import { asyncHandler } from "./utils/asyncHandler";

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

export default router;