"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, SECRET } from "@/lib/auth/types";
import { signSession } from "@/lib/auth/token";
import { cookieOptions } from "@/lib/auth/session-cookie";
import { authenticate, redirectFor } from "@/lib/auth/authenticate";
import { loginRateLimit, parseLoginBody } from "@/lib/auth/rate-limit";

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const reqLike = new Request("http://login.local", {
    headers: {
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
      "x-real-ip": h.get("x-real-ip") ?? "",
      "x-forwarded-proto": h.get("x-forwarded-proto") ?? "http",
    },
  });

  const limited = loginRateLimit(reqLike);
  if (!limited.ok) return { error: "Usuário ou senha inválidos" };

  const parsed = parseLoginBody({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed) return { error: "Usuário ou senha inválidos" };

  const session = await authenticate(parsed.email, parsed.password);
  if (!session || !SECRET) return { error: "Usuário ou senha inválidos" };

  const token = await signSession(session);
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions(reqLike));

  const next = String(formData.get("next") ?? "");
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : redirectFor(session);
  redirect(dest);
}
