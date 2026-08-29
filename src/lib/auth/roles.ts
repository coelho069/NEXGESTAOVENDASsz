import type { Role } from "@/lib/auth/types";

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  user: "Vendedor",
};

export function canAssignRole(actor: Role, target: Role): boolean {
  if (actor === "superadmin") return true;
  if (actor === "admin" && target === "user") return true;
  return false;
}
