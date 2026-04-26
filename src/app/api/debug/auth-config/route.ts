import { NextResponse } from "next/server";

export async function GET() {
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  return NextResponse.json({
    status: "ok",
    authUrl: authUrl ?? null,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    environment: {
      AUTH_URL: !!process.env.AUTH_URL,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
    },
    missing: [
      ...(process.env.AUTH_URL ? [] : ["AUTH_URL"]),
      ...(process.env.NEXTAUTH_URL ? [] : ["NEXTAUTH_URL"]),
      ...(process.env.NEXT_PUBLIC_APP_URL ? [] : ["NEXT_PUBLIC_APP_URL"]),
      ...(process.env.AUTH_GOOGLE_ID ? [] : ["AUTH_GOOGLE_ID"]),
      ...(process.env.AUTH_GOOGLE_SECRET ? [] : ["AUTH_GOOGLE_SECRET"]),
      ...(process.env.AUTH_SECRET ? [] : ["AUTH_SECRET"]),
      ...(process.env.DATABASE_URL ? [] : ["DATABASE_URL"]),
    ],
  });
}
