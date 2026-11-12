import { prisma } from "@/lib/prisma";
import { assertJadwalDalamScope, getScope, getScopeMaps } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("jadwal.edit");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";

  try {
    const { id } = await params;

    const scope = await getScope(userId);
    if (!scope) {
      return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
    }

    const existing = await prisma.jadwal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    // Hanya jadwal di dalam cakupan wilayah akun yang boleh ditutup.
    assertJadwalDalamScope(
      scope,
      {
        tingkat: existing.tingkat,
        desaIds: existing.desaIds ?? [],
        kelompokIds: existing.kelompokIds ?? [],
      },
      await getScopeMaps(),
      "jadwal"
    );

    const jadwal = await prisma.jadwal.update({
      where: { id },
      data: { statusBuka: "Tutup", ditutupPada: new Date() },
    });

    return NextResponse.json({ ok: true, jadwal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menutup sesi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
