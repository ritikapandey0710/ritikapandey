import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import ticketRouter from "./ticket.router";
import userRouter from "./modules/user/user.router";

const requiredEnvVars = ["DATABASE_URL", "AUTH_SECRET"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
  credentials: true,
}));

// Rate limiting for all environments
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, _res, next) => {
  const safeMethod = req.method.replace(/[\r\n]/g, '');
  const safeUrl = req.url.replace(/[\r\n]/g, '');
  console.log(`[${new Date().toISOString()}] ${safeMethod} ${safeUrl}`);
  next();
});

// Auth routes must come BEFORE express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// Body parser after auth
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Help Desk API" });
});

// Authentication middleware for ticket routes
app.use("/api/tickets", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Attach user info to request for authorization checks
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

app.use("/api/tickets", ticketRouter);

// User routes (admin only)
app.use("/api/users", userRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
