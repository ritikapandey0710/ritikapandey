import { prisma } from "../lib/prisma";

/**
 * Service for managing the AI agent user.
 * The AI agent is a regular User with role AGENT and a well-known email.
 */
export const AI_AGENT_EMAIL = "ai@helpdesk.local";
export const AI_AGENT_NAME = "AI";

/**
 * Find the AI agent user if it exists.
 */
export async function findAIAgent() {
  return prisma.user.findUnique({
    where: { email: AI_AGENT_EMAIL },
  });
}

/**
 * Find the AI agent, creating it if it does not exist.
 * Safe to call multiple times - will not create duplicates.
 */
export async function getOrCreateAIAgent() {
  const existing = await findAIAgent();
  if (existing) return existing;

  // Create the AI agent directly in the user table.
  // It does not need a password/account since it is a system agent.
  return prisma.user.create({
    data: {
      name: AI_AGENT_NAME,
      email: AI_AGENT_EMAIL,
      emailVerified: true,
      role: "AGENT",
    },
  });
}