import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth(authOptions);

export const GET = handler;

type NextAuthContext = { params: Promise<{ nextauth?: string[] }> };

export async function POST(req: NextRequest, context: NextAuthContext) {
  const { pathname } = new URL(req.url);

  // Intercept mobile login yang mengharapkan JSON response
  if (pathname.includes("/signin/credentials")) {
    const body = await req.clone().json();

    if (body.json === true) {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email dan password wajib diisi" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 }
        );
      }

      // Buat JWT token sederhana untuk mobile
      const token = `${user.id}:${Date.now()}`;

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }
  }

  return handler(req, context);
}
