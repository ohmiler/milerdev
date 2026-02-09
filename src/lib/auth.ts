import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: schema.users,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("[AUTH] Missing email or password");
                    throw new Error("Invalid credentials");
                }

                console.log("[AUTH] Login attempt for:", credentials.email);

                const user = await db.query.users.findFirst({
                    where: eq(schema.users.email, credentials.email as string),
                });

                if (!user) {
                    console.log("[AUTH] User not found for email:", credentials.email);
                    throw new Error("Invalid credentials");
                }

                if (!user.passwordHash) {
                    console.log("[AUTH] User found but passwordHash is NULL for:", credentials.email);
                    throw new Error("Invalid credentials");
                }

                console.log("[AUTH] User found, hash starts with:", user.passwordHash.substring(0, 10));

                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );

                console.log("[AUTH] Password valid:", isValidPassword);

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
