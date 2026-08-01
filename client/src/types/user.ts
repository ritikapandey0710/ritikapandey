import type { User } from "better-auth";

export interface AuthUser extends User {
  role: string;
}