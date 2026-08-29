import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";

export async function GET() {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  return NextResponse.json({ user });
}
