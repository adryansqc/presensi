// app/api/jamaah/route.ts
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;  // ← TOLAK kalau tidak login

  const jamaah = await prisma.jamaah.findMany();
  return NextResponse.json(jamaah);
}