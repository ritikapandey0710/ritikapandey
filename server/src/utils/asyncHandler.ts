/**
 * Wrapper for async route handlers to pass errors to error-handling middleware
 * Usage: router.get('/', authenticate, asyncHandler(async (req, res) => { ... }))
 */
import type { Request, Response, NextFunction } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler =
  (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };