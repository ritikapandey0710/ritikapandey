import type { User } from "better-auth/types";

export interface AuthUser extends User {
  role: string;
}