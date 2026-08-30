import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";
import { stubFiscalProvider } from "@/lib/fiscal/provider";
import { executeFiscalEmit } from "@/lib/fiscal/http";

/**
 * POST /api/fiscal/emit
 *
 * Corpo JSON:
 * { model: "55"|"65", storeId?: string, contingency?: "none"|"offline"|"svc", sale: Sale }
 *
 * Sessão: cookie `fg_session` (mesmo padrão de /api/billing/checkout).
 * Provedor: stub legado — valida 55/65, não chama SEFAZ e não autoriza DF-e.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  const body = await req.json().catch(() => null);
  const result = executeFiscalEmit(user, body, stubFiscalProvider);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET() {
  return NextResponse.json(
    { error: "Método não permitido." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
