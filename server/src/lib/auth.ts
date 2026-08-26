import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: (() => {
    const envUrl = process.env.BETTER_AUTH_URL;
    if (envUrl) {
      // Ensure URL has a protocol
      if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
        return `https://${envUrl}`;
      }
      return envUrl;
    }
    return `http://localhost:${process.env.PORT || 18080}`;
  })(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: (() => {
    const baseUrls = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ];

    const envUrl = process.env.BETTER_AUTH_URL;
    if (envUrl) {
      // Ensure URL has a protocol for trusted origins
      let originUrl = envUrl;
      if (!originUrl.startsWith('http://') && !originUrl.startsWith('https://')) {
        originUrl = `https://${envUrl}`;
      }
      baseUrls.push(originUrl);
    }

    return baseUrls;
  })(),
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
