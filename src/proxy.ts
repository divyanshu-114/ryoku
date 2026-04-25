import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const { pathname } = req.nextUrl;

    // Protect dashboard routes
    if (pathname.startsWith("/dashboard") && !isLoggedIn) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/dashboard/:path*"],
};
