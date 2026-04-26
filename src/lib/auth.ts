import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
if (!authUrl) {
    console.error(
        "NextAuth configuration error: AUTH_URL and NEXTAUTH_URL are both missing."
    );
    throw new Error(
        "Missing required environment variable: AUTH_URL (or NEXTAUTH_URL for compatibility)."
    );
}
process.env.AUTH_URL = authUrl;

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: [
        Google({
            clientId: requireEnv("AUTH_GOOGLE_ID"),
            clientSecret: requireEnv("AUTH_GOOGLE_SECRET"),
            // Disable PKCE for localhost to avoid cookie parsing issues on non-SSL
            checks: ["state"],
        }),
    ],
    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.image = token.picture as string | undefined;
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.sub = user.id;
            }
            if (account?.provider === "google" && account.profile) {
                token.picture = (account.profile as any).picture;
            }
            return token;
        },
    },
});
