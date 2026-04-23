import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";
const publicPaths = ["/login"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME);
  const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME);
  const hasValidAccessCookie = accessCookie && accessCookie.value.trim().length > 0;
  const hasValidRefreshCookie = refreshCookie && refreshCookie.value.trim().length > 0;

  // Let requests through when a refresh token exists so the client can
  // recover an expired access token without forcing a full re-login.
  if (!isPublicPath && !hasValidAccessCookie && !hasValidRefreshCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
