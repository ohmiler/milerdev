import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createGoogleProvider, isTrustedGoogleProfile } from "./auth-google";

const EXPECTED_AUTH_ERROR_TYPES = new Set(["CredentialsSignin", "MissingCSRF"]);

function getAuthErrorType(error: Error): string {
    const maybeTypedError = error as Error & { type?: unknown };
    return typeof maybeTypedError.type === "string" ? maybeTypedError.type : error.name;
}

function logAuthError(error: Error): void {
    const type = getAuthErrorType(error);

    if (EXPECTED_AUTH_ERROR_TYPES.has(type)) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[auth][expected] ${type}: ${error.message}`);
        }
        return;
    }

    console.error(`[auth][error] ${type}: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    logger: {
        error: logAuthError,
    },
    adapter: DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    providers: [
        ...(process.env.AUTH_GOOGLE_ID ? [createGoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        })] : []),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const normalizedEmail = (credentials.email as string).toLowerCase().trim();
                const user = await db.query.users.findFirst({
                    where: eq(schema.users.email, normalizedEmail),
                });

                if (!user) {
                    return null;
                }

                if (!user.passwordHash) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );

                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === "google") {
                return isTrustedGoogleProfile(profile);
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
                token.roleCheckedAt = Date.now();
            }

            // Refresh admin roles on every session check so demotions take effect immediately.
            // Non-admin roles still use a short cache to avoid extra DB load on every request.
            const ROLE_REFRESH_MS = token.role === "admin" ? 0 : 5 * 60 * 1000;
            const lastChecked = (token.roleCheckedAt as number) || 0;
            if (Date.now() - lastChecked > ROLE_REFRESH_MS && token.id) {
                try {
                    const freshUser = await db.query.users.findFirst({
                        where: eq(schema.users.id, token.id as string),
                        columns: { role: true },
                    });
                    if (freshUser) {
                        token.role = freshUser.role;
                    } else {
                        delete token.role;
                    }
                    token.roleCheckedAt = Date.now();
                } catch {
                    // On DB error, keep existing role; admin tokens will retry next request.
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
});
