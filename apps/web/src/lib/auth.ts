import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@accessscan/db";
import { verifyPassword } from "./password.js";

// A valid bcrypt hash compared against when the email is unknown, so a missing
// user and a wrong password take the same time (no user-enumeration oracle).
const DUMMY_HASH = "$2a$12$07DhkVF11xqhfQWpaKnTzuXhvV6ENzoPzwZSs1oHbofueMbLyxQUe";

const _auth: NextAuthResult = NextAuth({
  // Short session lifetime so a revoked/role-changed account loses access within
  // hours rather than the 30-day default.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) ?? "MEMBER";
      }
      return session;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = _auth.handlers;
export const auth: NextAuthResult["auth"] = _auth.auth;
export const signIn: NextAuthResult["signIn"] = _auth.signIn;
export const signOut: NextAuthResult["signOut"] = _auth.signOut;
