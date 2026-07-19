import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

console.log("Loading auth module...");

export const auth = betterAuth({
  baseURL: "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enableSignIn: true,
    enableSignUp: true,
  },
  trustedOrigins: ["http://localhost:5173"],
  secret: process.env.AUTH_SECRET,
});

console.log("Auth module loaded");
