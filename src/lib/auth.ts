import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prismaBase } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getAccessProfile } from "@/lib/access";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;

      if (!email || !password) {
        return null;
      }

      const user = await prismaBase.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          emailVerified: true,
        },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaBase),
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id) return true;

      try {
        const googleAccountId = account?.provider === "google" ? account.providerAccountId : null;
        const profile = getAccessProfile({
          email: user.email,
          googleAccountId,
        });

        await prismaBase.user.update({
          where: { id: user.id },
          data: {
            role: profile.role,
            accountType: profile.accountType,
          },
        });
      } catch (err) {
        // Don't block sign-in if role update fails -- jwt callback will set it later
        console.error("signIn callback: failed to update role", err);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (account?.provider === "google") {
        token.googleAccountId = account.providerAccountId;
      }

      if (token.id) {
        const dbUser = await prismaBase.user.findUnique({
          where: { id: token.id },
          select: {
            email: true,
            role: true,
            accountType: true,
            accounts: {
              where: { provider: "google" },
              select: { providerAccountId: true },
              take: 1,
            },
          },
        });

        const googleAccountId = dbUser?.accounts[0]?.providerAccountId ?? token.googleAccountId ?? null;
        const profile = getAccessProfile({
          email: dbUser?.email ?? token.email,
          role: dbUser?.role,
          accountType: dbUser?.accountType,
          googleAccountId,
        });

        token.role = profile.role;
        token.accountType = profile.accountType;
        token.isAdmin = profile.isAdmin;
        token.googleAccountId = googleAccountId;

        if (dbUser && (dbUser.role !== profile.role || dbUser.accountType !== profile.accountType)) {
          await prismaBase.user.update({
            where: { id: token.id },
            data: {
              role: profile.role,
              accountType: profile.accountType,
            },
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
        session.user.accountType = (token.accountType as "FREE" | "PAID" | undefined) ?? "FREE";
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.googleAccountId = (token.googleAccountId as string | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
