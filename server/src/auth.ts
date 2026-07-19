import { prisma } from "./prisma";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enableSignIn: true,
    enableSignUp: false,
  },
  trustedOrigins: ["http://localhost:5173"],
  secret: process.env.AUTH_SECRET,
});
