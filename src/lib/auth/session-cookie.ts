import { COOKIE } from "@/lib/auth/types";

export function cookieOptions(req?: Request) {
  const proto =
    req?.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const secure = proto.includes("https");
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure,
  };
}

export { COOKIE };
