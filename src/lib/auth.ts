import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
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
        ...(process.env.AUTH_GOOGLE_ID ? [Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
        })] : []),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const normalizedEmail = (credentials.email as string).toLowerCase().trim();
                const user = await db.query.users.findFirst({
                    where: eq(schema.users.email, normalizedEmail),
                });

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                if (!user.passwordHash) {
                    throw new Error("Invalid credentials");
                }

                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );

                if (!isValidPassword) {
                    throw new Error("Invalid credentials");
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
                token.roleCheckedAt = Date.now();
            }

            // Refresh role from DB every 5 minutes to prevent privilege persistence
            const ROLE_REFRESH_MS = 5 * 60 * 1000;
            const lastChecked = (token.roleCheckedAt as number) || 0;
            if (Date.now() - lastChecked > ROLE_REFRESH_MS && token.id) {
                try {
                    const freshUser = await db.query.users.findFirst({
                        where: eq(schema.users.id, token.id as string),
                        columns: { role: true },
                    });
                    if (freshUser) {
                        token.role = freshUser.role;
                    }
                    token.roleCheckedAt = Date.now();
                } catch {
                    // On DB error, keep existing role — will retry next request
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
