import "dotenv/config";
console.log('DEBUG: index.ts loaded');
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import ticketRouter from "./routes/ticket.routes";
import userRouter from "./routes/user.routes";
import aiRouter from "./routes/ai.routes";
import webhookRouter from "./routes/webhooks";
import { EmailService } from "./services/email.service";

console.log("Server starting..."); // Debug line

const requiredEnvVars = ["DATABASE_URL", "AUTH_SECRET"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  })
);

// Rate limiting for all environments
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, _res, next) => {
  const safeMethod = req.method.replace(/[\r\n]/g, "");
  const safeUrl = req.url.replace(/[\r\n]/g, "");
  console.log(`[${new Date().toISOString()}] ${safeMethod} ${safeUrl}`);
  next();
});

// Body parser MUST come BEFORE auth routes for JSON bodies to be parsed
app.use(express.json());

// Proper better-auth integration - mount at /api/auth
console.log('Mounting auth middleware at /api/auth');
app.use("/api/auth", toNodeHandler(auth));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Help Desk API" });
});

// Test route to see if server is responding
app.get("/api/test", (_req: Request, res: Response) => {
  res.json({ message: "Test endpoint working" });
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

// Webhook routes (no authentication required for external systems)
app.use("/api/webhooks", webhookRouter);

// User routes (admin only)
app.use("/api/users", userRouter);

// AI routes (polish reply)
app.use("/api/ai", aiRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Initialize and start email service
const startEmailService = async () => {
  try {
    // Check if email configuration is present
    const requiredEmailVars = [
      'EMAIL_IMAP_HOST',
      'EMAIL_IMAP_USER',
      'EMAIL_IMAP_PASS'
    ];

    const missingVars = requiredEmailVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log(`Email service not started. Missing environment variables: ${missingVars.join(', ')}`);
      console.log('To enable email processing, please configure IMAP settings in .env file');
      return;
    }

    // Prepare email service options
    const emailOptions: any = {
      imap: {
        user: process.env.EMAIL_IMAP_USER!,
        password: process.env.EMAIL_IMAP_PASS!,
        host: process.env.EMAIL_IMAP_HOST!,
        port: parseInt(process.env.EMAIL_IMAP_PORT || '993', 10),
        tls: process.env.EMAIL_IMAP_TLS?.toLowerCase() === 'true' || true,
        authTimeout: parseInt(process.env.EMAIL_IMAP_AUTH_TIMEOUT || '5000', 10),
      },
      from: process.env.EMAIL_FROM || process.env.EMAIL_IMAP_USER!,
    };

    // Add SMTP configuration if present
    if (process.env.EMAIL_SMTP_HOST && process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS) {
      emailOptions.smtp = {
        host: process.env.EMAIL_SMTP_HOST!,
        port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
        secure: process.env.EMAIL_SMTP_TLS?.toLowerCase() === 'true' ? true : false,
        user: process.env.EMAIL_SMTP_USER!,
        pass: process.env.EMAIL_SMTP_PASS!,
      };
    }

    const emailService = new EmailService(emailOptions);
    await emailService.initialize();

    // Start polling for emails
    const pollInterval = parseInt(process.env.EMAIL_POLL_INTERVAL || '300000', 10); // 5 minutes default
    console.log(`Starting email polling every ${pollInterval / 1000} seconds`);

    // Initial check
    await emailService.checkForNewEmails();

    // Set up periodic checking
    setInterval(async () => {
      try {
        await emailService.checkForNewEmails();
      } catch (error) {
        console.error('Error during email polling:', error);
      }
    }, pollInterval);

  } catch (error) {
    console.error('Failed to start email service:', error);
    // Don't crash the server if email service fails
  }
};

// Start email service
startEmailService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});