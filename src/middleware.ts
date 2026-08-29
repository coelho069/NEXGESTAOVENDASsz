import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";
import { isSubExpired } from "@/lib/billing/dates";

function isPublic(path: string) {
  if (path === "/" || path === "/loja" || path === "/login") return true;
  if (path.startsWith("/api/auth/login")) return true;
  if (path.startsWith("/nfe-demo.xml")) return true;
  return false;
}

function isAdminPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/dashboard");
}

function isAppPath(path: string) {
  return (
    isAdminPath(path) ||
    path.startsWith("/user") ||
    path.startsWith("/pos")
  );
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (isPublic(path) || path.startsWith("/_next") || path.startsWith("/api/auth/me")) {
    if (path.startsWith("/api/auth/me") || path.startsWith("/api/auth/logout")) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (path.startsWith("/api/")) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const user = await verifySession(token);

  if ((path === "/assinatura" || path.startsWith("/assinatura")) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isAppPath(path) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const expired = user ? isSubExpired(user.subExpiresAt, user.role) : false;
  if (
    user &&
    expired &&
    path !== "/assinatura" &&
    !path.startsWith("/assinatura") &&
    (isAppPath(path) || path.startsWith("/admin") || path.startsWith("/user") || path.startsWith("/pos"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/assinatura";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/admin/db") && user.role !== "superadmin") {
    const url = req.nextUrl.clone();
    url.pathname = user.role === "admin" ? "/admin/dashboard" : "/user/pdv";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  if (user && isAdminPath(path) && user.role !== "admin" && user.role !== "superadmin") {
    const url = req.nextUrl.clone();
    url.pathname = "/user/pdv";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml)$).*)"],
};
