import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./prisma";
import ticketRouter from "./ticket.router";

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "AUTH_SECRET"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

const app = express();
const port = process.env.PORT || 3001;

// CORS must be first - allow both localhost and 127.0.0.1 for dev flexibility
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Body parser
app.use(express.json());

// Auth routes — must be before json middleware for better-auth
app.use("/api/auth", auth.handler);

// Ticket routes
app.use("/api/tickets", ticketRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Auth API" });
});

app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
