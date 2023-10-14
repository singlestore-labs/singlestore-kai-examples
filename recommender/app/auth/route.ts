import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  return NextResponse.json(
    {},
    { status: 401, headers: { "WWW-authenticate": "Basic" } }
  );
}
