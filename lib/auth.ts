import { PrismaAdapter } from "@auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Pakai JWT, bukan database session — lebih cepat
  },
  pages: {
    signIn: "/login", // Halaman login kustom kita
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Cari user berdasarkan email/username
        const user = await prisma.user.findUnique({
          where: { email: credentials.username },
        });

        if (!user || !user.password) {
          return null;
        }

        // Verifikasi password dengan bcrypt
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        // Kembalikan data user (TANPA password) — ini yang masuk ke JWT
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // role dari database, bukan dari frontend!
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Saat login pertama, simpan role ke token
      if (user) {
        token.role = (user as unknown as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Saat session dicek, ambil role dari token (bukan dari frontend!)
      if (session.user) {
        const sessionUser = session.user as unknown as {
          role?: string;
          id?: string;
        };
        sessionUser.role = typeof token.role === "string" ? token.role : undefined;
        sessionUser.id = typeof token.id === "string" ? token.id : undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};