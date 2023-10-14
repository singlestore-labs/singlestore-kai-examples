import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/"],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("Authorization");
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, pwd] = atob(authValue).split(":");

    if (user === "singlestore" && pwd === "kaipass") {
      return NextResponse.next();
    }
  }
  url.pathname = "/auth";

  return NextResponse.rewrite(url);
}
