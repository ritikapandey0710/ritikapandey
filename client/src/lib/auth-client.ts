import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:3001' : import.meta.env.VITE_API_BASE_URL || '',
});