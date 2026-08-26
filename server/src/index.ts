// EARLY INSTRUMENTATION: must be the first import so @sentry/node is
// initialized before any application module loads (Sentry recommended
// pattern). See src/instrument.ts. Initialization itself is guarded inside
// lib/sentry.ts, so Sentry.init runs exactly once per process.
import "./instrument";
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
import resendWebhookRouter from "./routes/resendWebhooks";
import dashboardRouter from "./routes/dashboard.routes";
import { EmailService } from "./services/email.service";
import { verifyWebhookSignature } from "./middleware/webhook.middleware";
import { verifyResendWebhookSignature } from "./middleware/resendWebhook.middleware";
import { startDeliveryWorker } from "./services/emailDelivery.service";
import { captureServerError, attachExpressErrorHandler } from "./lib/sentry";
import path from "path";

// Report unhandled promise rejections to Sentry without changing behavior.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  captureServerError(reason, { operation: "unhandledRejection" });
});


console.log("Server starting..."); // Debug line

const requiredEnvVars = ["DATABASE_URL", "AUTH_SECRET", "WEBHOOK_SECRET"];
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
      // Railway domain - will be set via environment variable
      process.env.RAILWAY_STATIC_URL,
      // Alternative: Public domain for Railway
      process.env.PUBLIC_DOMAIN,
      // Fallback for development
      "http://localhost:5173"
    ].filter(Boolean) as string[], // Remove falsy values
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

// Body parser MUST come BEFORE auth routes for JSON bodies to be parsed.
// The `verify` callback preserves the raw Buffer so that webhook signature
// verification (see middleware/webhook.middleware.ts) can compute HMAC over
// the exact bytes the client sent.
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Proper better-auth integration - mount at /api/auth
console.log('Mounting auth middleware at /api/auth');
app.use("/api/auth", toNodeHandler(auth));

// Debug route to test auth API directly
app.get("/debug/auth-test", async (_req, res) => {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: "debug@example.com",
        password: "debug123",
        name: "Debug User"
      }
    });
    res.json({ success: !!result, data: result });
  } catch (e: unknown) {
    res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
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

// Webhook routes — signature verification middleware runs before the router.
// External systems must sign the request body with WEBHOOK_SECRET.
app.use("/api/webhooks", verifyWebhookSignature, webhookRouter);

// Resend delivery-event webhooks (Svix-signed with RESEND_WEBHOOK_SECRET).
app.use("/api/webhooks/resend", verifyResendWebhookSignature, resendWebhookRouter);

// User routes (admin only)
app.use("/api/users", userRouter);

// AI routes (polish reply)
app.use("/api/ai", aiRouter);

// Dashboard routes (protected)
app.use("/api/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error("Dashboard authentication error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
app.use("/api/dashboard", dashboardRouter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Always return the index.html for routes not handled by the API or static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist', 'index.html'));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});


// Global (final/fallback) error handler. Existing response format is fully
// preserved. Capturing is handled by Sentry's Express error middleware above,
// so we do NOT call captureServerError here (avoids duplicate events).
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
        captureServerError(error, { service: "email", operation: "polling" });
      }
    }, pollInterval);

  } catch (error) {
    console.error('Failed to start email service:', error);
    captureServerError(error, { service: "email", operation: "initialize" });
    // Don't crash the server if email service fails
  }
};

// Start email service
startEmailService();

// Start the outbound email delivery retry worker (Phase 5). Re-sends
// QUEUED/FAILED outbound emails using their stored snapshots until sent or
// attempts are exhausted. Enabled by default; disable with EMAIL_RETRY_ENABLED=false.
if (process.env.EMAIL_RETRY_ENABLED !== "false") {
  const retryIntervalMs = parseInt(process.env.EMAIL_RETRY_INTERVAL_MS || "60000", 10);
  startDeliveryWorker(retryIntervalMs);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});