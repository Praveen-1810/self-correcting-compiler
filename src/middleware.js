import { NextResponse } from "next/server";

export const config = {
  matcher: "/integrations/:path*",
};

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-createxyz-project-id", "e02cf810-5ae0-4cad-ba71-54badd6064d8");
  requestHeaders.set("x-createxyz-project-group-id", "ea70de70-ebdb-49fe-b4e9-f7dcc66e537b");


  request.nextUrl.href = `https://www.create.xyz/${request.nextUrl.pathname}`;

  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}