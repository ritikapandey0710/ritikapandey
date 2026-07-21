import { Router } from "express";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket
} from "./ticket.controller";

const router = Router();

// GET all tickets (with optional filtering)
router.get("/", getTickets);

// GET single ticket by ID
router.get("/:id", getTicketById);

// POST create new ticket
router.post("/", createTicket);

// PUT/PATCH update ticket
router.patch("/:id", updateTicket);

// DELETE ticket
router.delete("/:id", deleteTicket);

export default router;