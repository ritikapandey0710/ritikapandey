import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import ticketRouter from "./ticket.router";

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

// Rate limiting in production only
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use(limiter);
}

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
