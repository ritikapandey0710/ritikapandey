import { Router } from "express";
import { polishReply } from "./ai.controller";
import { asyncHandler } from "./utils/asyncHandler";

const router = Router();

// POST polish a reply using AI
router.post("/polish", asyncHandler(polishReply));

export default router;