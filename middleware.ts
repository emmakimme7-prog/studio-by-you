import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const assetPrefixes = ["/_next", "/api", "/home-assets", "/favicon", "/icon", "/images", "/yt-demo", "/vote-demo"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  if (!host.startsWith("studiobyyou-")) {
    return NextResponse.next();
  }

  if (assetPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/studiobyyou")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname === "/" ? "/studiobyyou" : `/studiobyyou${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|home-assets|favicon|icon\\.png|seo\\.jpg|robots\\.txt|sitemap\\.xml|images).*)",
  ],
};
