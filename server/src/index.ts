import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
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
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
}));

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

app.use("/api/tickets", ticketRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
