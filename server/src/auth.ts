import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
  secret: process.env.AUTH_SECRET,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
  // Enhanced session security
  session: {
    cookie: {
      name: "authjs.session-token",
      expires: 30 * 24 * 60 * 60, // 30 days in seconds
      sameSite: "lax" as const,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      domain: process.env.NODE_ENV === "production" ? undefined : undefined,
    },
    // Update activity on each request
    updateAge: 60 * 60, // 1 hour in seconds
  },
  // Enable rate limiting to prevent brute force attacks
  rateLimit: {
    // Allow 5 failed attempts per 15 minutes per IP
    getKey: (c) => c.ip,
    window: 15 * 60, // 15 minutes
    max: 5,
  },
});
