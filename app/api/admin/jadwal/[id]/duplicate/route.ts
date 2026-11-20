import { prisma } from "@/lib/prisma";
import {
  assertJadwalDalamScope,
  getScope,
  getScopeMaps,
} from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("jadwal.create");
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

    // Jadwal sumber harus berada di dalam cakupan akun.
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

    const jadwal = await prisma.jadwal.create({
      data: {
        tanggal: existing.tanggal,
        jenisPengajian: existing.jenisPengajian,
        jamMulai: existing.jamMulai,
        jamSelesai: existing.jamSelesai,
        tingkat: existing.tingkat,
        desaIds: existing.desaIds ?? [],
        kelompokIds: existing.kelompokIds ?? [],
        kategoriIds: existing.kategoriIds ?? [],
        statusBuka: "Tutup",
        slugPublik: null,
        linkPublikAktif: false,
        ditutupPada: null,
        dibuatOleh: userId,
      },
      include: {
        dibuatOlehUser: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, jadwal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengulang jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
