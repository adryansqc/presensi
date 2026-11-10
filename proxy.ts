import { withAuth } from "next-auth/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request as Parameters<typeof authProxy>[0], event);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
