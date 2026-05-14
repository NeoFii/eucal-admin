import type { AdminRole } from "@/types";

const ROLE_INT_TO_STRING: Record<number, AdminRole> = {
  0: "admin",
  1: "super_admin",
};

const ROLE_STRING_TO_INT: Record<AdminRole, number> = {
  admin: 0,
  super_admin: 1,
};

export function mapRoleFromApi(role: number | string): AdminRole {
  if (typeof role === "number") return ROLE_INT_TO_STRING[role] ?? "admin";
  return role as AdminRole;
}

export function mapRoleToApi(role: AdminRole): number {
  return ROLE_STRING_TO_INT[role] ?? 0;
}
