// Enum for user roles in the help desk system
export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT'
}

// Optional: Add a utility function to validate role values
export const isValidRole = (value: string): value is Role => {
  return Object.values(Role).includes(value as Role);
}

// Optional: Add a utility function to get all role values
export const getAllRoles = (): Role[] => {
  return Object.values(Role).filter(
    (value): value is Role => typeof value === 'string'
  ) as Role[];
}