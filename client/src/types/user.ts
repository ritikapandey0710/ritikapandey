import type { User } from "better-auth";
import { UserRole } from './role';

export interface AuthUser extends User {
  role: UserRole;
}