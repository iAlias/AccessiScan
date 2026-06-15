import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@accessscan/db";
import { verifyPassword } from "./password.js";

const _auth: NextAuthResult = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
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
