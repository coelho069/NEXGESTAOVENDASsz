import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Role } from "@/lib/auth/types";
import { publicDirectory } from "@/lib/auth/demo-users";
import { generateSecurePassword, passwordMeetsPolicy } from "@/lib/auth/generate-password";
import { hashPassword, verifyPassword } from "@/lib/auth/password-hash";
import { uuid } from "@/lib/utils";

export { ROLE_LABEL, canAssignRole } from "@/lib/auth/roles";

export type PublicAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at?: string;
};

type StoredAccount = PublicAccount & { passwordHash: string };

const FILE = join(process.cwd(), ".data", "accounts.json");

async function load(): Promise<StoredAccount[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(rows: StoredAccount[]) {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2), { mode: 0o600 });
}

export async function listPublicAccounts(): Promise<PublicAccount[]> {
  const stored = (await load()).map(({ passwordHash: _hash, ...pub }) => pub);
  const envUsers = publicDirectory().filter(
    (u) => !stored.some((s) => s.email.toLowerCase() === u.email.toLowerCase())
  );
  return [...stored, ...envUsers];
}

export async function findStoredUser(email: string, password: string) {
  const needle = email.trim().toLowerCase();
  const acc = (await load()).find((r) => r.email.toLowerCase() === needle);
  if (!acc) return null;
  if (!(await verifyPassword(password, acc.passwordHash))) return null;
  return { id: acc.id, email: acc.email, name: acc.name, role: acc.role };
}

export async function createAccount(input: {
  email: string;
  name: string;
  role: Role;
  password?: string;
}): Promise<{ account: PublicAccount; password: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  const role = input.role;
  if (role !== "admin" && role !== "user" && role !== "superadmin") {
    throw new Error("Papel inválido.");
  }
  const name = input.name.trim() || email.split("@")[0]!;

  const rows = await load();
  const taken =
    rows.some((r) => r.email.toLowerCase() === email) ||
    publicDirectory().some((u) => u.email.toLowerCase() === email);
  if (taken) throw new Error("E-mail já cadastrado.");

  let password = input.password?.trim() ?? "";
  if (!password) password = generateSecurePassword();
  if (!passwordMeetsPolicy(password)) {
    throw new Error("Senha fora da política (16–24, maiúscula, minúscula, número, símbolo).");
  }

  const account: StoredAccount = {
    id: uuid(),
    email,
    name,
    role,
    passwordHash: await hashPassword(password),
    created_at: new Date().toISOString(),
  };
  rows.push(account);
  await persist(rows);
  return {
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      created_at: account.created_at,
    },
    password,
  };
}
