import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    return new NextResponse("Admin credentials are not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [providedUser, providedPassword] = atob(authorization.slice(6)).split(":");
      if (providedUser === username && providedPassword === password) {
        return NextResponse.next();
      }
    } catch {}
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RSVP admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
