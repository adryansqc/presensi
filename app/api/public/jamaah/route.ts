import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Daftar jamaah untuk form absensi publik.
 * - `kelompokId` (opsional): batasi ke satu kelompok
 * - `q` (opsional): filter pencarian nama
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const kelompokId = searchParams.get("kelompokId");

    const jamaah = await prisma.jamaah.findMany({
      where: {
        nama: q ? { contains: q, mode: "insensitive" } : undefined,
        statusAktif: "Aktif",
        kelompokId: kelompokId && kelompokId !== "all" ? kelompokId : undefined,
      },
      select: {
        id: true,
        nama: true,
        kategoriId: true,
        desaId: true,
        kelompokId: true,
        desa: { select: { nama: true } },
        kelompok: { select: { nama: true } },
      },
      take: kelompokId ? 500 : 20,
      orderBy: { nama: "asc" },
    });

    return NextResponse.json(jamaah);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jamaah.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
