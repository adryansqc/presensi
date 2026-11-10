import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const jamaah = await prisma.jamaah.findMany({
      where: {
        nama: { contains: q, mode: "insensitive" },
        statusAktif: "Aktif",
      },
      select: {
        id: true,
        nama: true,
        desa: { select: { nama: true } },
        kelompok: { select: { nama: true } },
      },
      take: 20,
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(jamaah);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jamaah.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
