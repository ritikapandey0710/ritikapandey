import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./prisma";

const app = express();
const port = process.env.PORT || 3001;

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Test database connection
app.get("/api/db-test", async (_req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    res.json({ message: "Database connected", userCount: count });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Body parser - MUST be before auth middleware
app.use(express.json());

// CORS middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Auth middleware - MUST be after json middleware
app.all("/api/auth/*", (req, res, next) => {
  console.log(`[AUTH MIDDLEWARE] ${req.method} ${req.path}`);
  return toNodeHandler(auth)(req, res, next);
});

// Debug middleware to log requests after auth
app.use((req, res, next) => {
  console.log(`[POST-AUTH] ${req.method} ${req.path} - ${res.statusCode}`);
  next();
});

// Test route
app.get("/api/test", (req, res) => {
  res.send("test ok");
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Help Desk API" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
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