import { openDB } from "idb";
import type { Role } from "@/lib/auth/types";
import { uuid } from "@/lib/utils";

export interface Account {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  locked: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actor_id: string;
  actor_name: string;
  table: string;
  record_id: string;
  field: string;
  from: string;
  to: string;
  action: string;
}

const DB = "fluxogestao-admin-v1";

async function adb() {
  return openDB(DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("accounts")) db.createObjectStore("accounts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("audit")) db.createObjectStore("audit", { keyPath: "id" });
    },
  });
}

export async function listAccounts(): Promise<Account[]> {
  const db = await adb();
  const rows = await db.getAll("accounts");
  return rows.sort((a, b) => a.email.localeCompare(b.email));
}

export async function hydrateAccounts(dir: Array<{ id: string; email: string; name: string; role: Role }>) {
  const db = await adb();
  const existing = await db.getAll("accounts");
  const now = new Date().toISOString();
  for (const u of dir) {
    if (existing.some((e) => e.id === u.id)) continue;
    await db.put("accounts", {
      id: u.id,
      email: u.email,
      password: "",
      name: u.name,
      role: u.role,
      locked: false,
      created_at: now,
    });
  }
}

export async function saveAccount(acc: Account) {
  const db = await adb();
  await db.put("accounts", acc);
  return acc;
}

export async function findAccount(email: string, password: string) {
  const rows = await listAccounts();
  return rows.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
}

export async function writeAudit(entry: Omit<AuditLog, "id" | "at">) {
  const db = await adb();
  const log: AuditLog = {
    ...entry,
    id: uuid(),
    at: new Date().toISOString(),
  };
  await db.put("audit", log);
  return log;
}

export async function listAudit(): Promise<AuditLog[]> {
  const db = await adb();
  const rows = await db.getAll("audit");
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
