import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./prisma";
import ticketRouter from "./ticket.router";

const app = express();
const port = process.env.PORT || 3001;

// CORS must be first
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Body parser
app.use(express.json());

// Auth routes — must use {*path} wildcard for Express 5 compatibility
app.all("/api/auth/{*path}", toNodeHandler(auth));

// Ticket API routes
app.use("/api/tickets", ticketRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Help Desk API" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

app.get("/api/db-test", async (_req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    res.json({ message: "Database connected", userCount: count });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
