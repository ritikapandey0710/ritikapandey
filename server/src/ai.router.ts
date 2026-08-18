import { Router } from "express";
import { polishReply, summarizeTicket } from "./ai.controller";
import { asyncHandler } from "./utils/asyncHandler";

const router = Router();

// POST polish a reply using AI
router.post("/polish", asyncHandler(polishReply));
// POST summarize a ticket using AI
router.post("/summarize", asyncHandler(summarizeTicket));

export default router;