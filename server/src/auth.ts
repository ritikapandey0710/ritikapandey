import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

console.log("Loading auth module...");

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS
        ? process.env.TRUSTED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
        : ["*"], // Allow all origins for debugging (via TRUSTED_ORIGINS env var, comma separated)
  secret: process.env.AUTH_SECRET,
});

console.log("Auth instance:", Object.keys(auth));
console.log("Auth API:", Object.keys(auth.api));
console.log("Auth options:", Object.keys(auth.options ?? {}));
console.log("Auth middleware?", typeof auth.middleware);
console.log("Auth handler?", typeof auth.handler);
console.log("All keys:", Object.keys(auth));

console.log("Auth module loaded");