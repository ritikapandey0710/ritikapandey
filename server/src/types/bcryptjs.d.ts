declare module "bcryptjs" {
  export function hash(s: string, salt: number | string): Promise<string>;
  export function hashSync(s: string, salt: number | string): string;
  export function compare(s: string, encrypted: string): Promise<boolean>;
  export function compareSync(s: string, encrypted: string): boolean;
  export function genSalt(salt?: number): string;
  export function genSaltSync(salt?: number): string;
  export function getRounds(encrypted: string): number;
}
