import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-security";
import { adminHref } from "@/lib/admin-path";

export async function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      location: adminHref("/login")
    }
  });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
