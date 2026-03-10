import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "access_token";
// 公开路径，无需认证即可访问
const publicPaths = ["/login"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const hasValidAuthCookie = authCookie && authCookie.value.trim().length > 0;

  // 已登录用户访问登录页，重定向到仪表盘
  if (isPublicPath && hasValidAuthCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 未登录用户访问受保护路径，重定向到登录页
  if (!isPublicPath && !hasValidAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
