export type Role = "admin" | "user" | "superadmin";

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
  subExpiresAt: string | null;
}

export const COOKIE = "fg_session";
export const SECRET = process.env.FG_SESSION_SECRET || "";
