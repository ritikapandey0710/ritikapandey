import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/dashboard - protected dashboard stats
router.get("/", asyncHandler(getDashboardStats));

export default router;