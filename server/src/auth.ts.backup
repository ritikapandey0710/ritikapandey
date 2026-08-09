import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3001}`,
  basePath: "/api/auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ],
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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
    expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 60 * 60, // 1 hour in seconds
  },
  rateLimit: {
    window: 15 * 60,
    max: 100,
  },
});

console.log("Auth object keys:", Object.keys(auth));
console.log("Auth has routes?", !!auth.routes);
if (auth.routes) {
  console.log("Auth routes keys:", Object.keys(auth.routes));
}
