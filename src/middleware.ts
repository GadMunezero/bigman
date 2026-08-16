import { NextResponse, type NextRequest } from "next/server";

export const SESSION_COOKIE = "ppf_sid";

/**
 * Issues an anonymous session id on first visit.
 *
 * This is what lets the questionnaire, the results, saved challenges and the
 * personalised match badges work with no account and no sign-up wall. It is a
 * random opaque id — no personal information is derived from or attached to it.
 *
 * Middleware is the only place this can happen, because a Server Component can
 * read cookies but cannot set them.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
