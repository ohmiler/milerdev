import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./db/schema";
import { verifyPassword } from "@/lib/password-storage";
import { and, eq } from "drizzle-orm";
import { authorizeGoogleSignIn, createGoogleProvider, getGoogleLinkingRequestContext } from "./auth-google";
import { applyJwtSessionPolicy, exposeAuthorizedSession } from "./auth-session";
import { authorizeCredentials } from "./auth-credentials";
import { consumeAuthRateLimit } from "./auth-rate-limit";
import { resolveSafeAuthRedirect } from "./safe-auth-return";
import { restrictAccountLinking } from "@/lib/auth-account-linking";

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

export const { handlers, signIn, signOut, auth } = NextAuth((request) => ({
    trustHost: true,
    logger: {
        error: logAuthError,
    },
    adapter: restrictAccountLinking(DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)),
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
            async authorize(credentials, request) {
                return authorizeCredentials(credentials, request, {
                    consumeRateLimit: consumeAuthRateLimit,
                    findUserByEmail: async (email) => db.query.users.findFirst({
                        where: eq(schema.users.email, email),
                    }),
                    comparePassword: (password, passwordHash) => verifyPassword(
                        password,
                        passwordHash
                    ),
                });
            },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            const { recoveryRedirect } = getGoogleLinkingRequestContext(request);
            // Only this server-built recovery URL may enter an auth page.
            // Ordinary callback destinations still use the existing loop guard.
            if (url === recoveryRedirect) return new URL(recoveryRedirect, baseUrl).toString();
            return resolveSafeAuthRedirect(url, baseUrl);
        },
        async signIn({ account, profile }) {
            if (account?.provider === "google") {
                const { hasSessionCookie, recoveryRedirect } = getGoogleLinkingRequestContext(request);
                const decision = await authorizeGoogleSignIn(profile, account.providerAccountId, {
                    hasSessionCookie,
                    loadLinkedUser: async (providerAccountId) => {
                        const linked = await db.query.accounts.findFirst({
                            where: and(
                                eq(schema.accounts.provider, "google"),
                                eq(schema.accounts.providerAccountId, providerAccountId),
                            ),
                            with: { user: { columns: { deactivatedAt: true } } },
                        });
                        return linked?.user;
                    },
                    loadUserByEmail: (email) => db.query.users.findFirst({
                        where: eq(schema.users.email, email),
                        columns: { deactivatedAt: true },
                    }),
                });
                return decision === "recover" ? recoveryRedirect : decision === "allow";
            }

            return true;
        },
        async jwt({ token, user, account }) {
            return applyJwtSessionPolicy({
                token,
                user,
                accountProvider: account?.provider,
                loadUserState: async (userId) => db.query.users.findFirst({
                    where: eq(schema.users.id, userId),
                    columns: {
                        role: true,
                        sessionVersion: true,
                        deactivatedAt: true,
                    },
                }),
            });
        },
        async session({ session, token }) {
            return exposeAuthorizedSession(session, token);
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
}));
