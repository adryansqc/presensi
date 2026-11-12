import { prisma } from "@/lib/prisma";
import {
  assertJadwalDalamScope,
  getScope,
  getScopeMaps,
} from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("jadwal.edit");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";

  try {
    const { id } = await params;
    const body = await request.json();
    const { tanggal, jenisPengajian, jamMulai, jamSelesai, tingkat, desaIds, kelompokIds, kategoriIds, statusBuka } = body;

    const scope = await getScope(userId);
    if (!scope) {
      return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
    }

    const existing = await prisma.jadwal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    const maps = await getScopeMaps();

    // Jadwal yang sudah ada harus berada di dalam cakupan akun.
    assertJadwalDalamScope(
      scope,
      {
        tingkat: existing.tingkat,
        desaIds: existing.desaIds ?? [],
        kelompokIds: existing.kelompokIds ?? [],
      },
      maps,
      "jadwal"
    );

    // Nilai baru juga harus berada di dalam cakupan akun.
    const targetDesaIds = Array.isArray(desaIds) ? desaIds : (existing.desaIds ?? []);
    const targetKelompokIds = Array.isArray(kelompokIds) ? kelompokIds : (existing.kelompokIds ?? []);
    assertJadwalDalamScope(
      scope,
      {
        tingkat: tingkat ?? existing.tingkat,
        desaIds: targetDesaIds,
        kelompokIds: targetKelompokIds,
      },
      maps,
      "jadwal"
    );

    const jadwal = await prisma.jadwal.update({
      where: { id },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        jenisPengajian,
        jamMulai,
        jamSelesai,
        tingkat,
        desaIds: Array.isArray(desaIds) ? desaIds : undefined,
        kelompokIds: Array.isArray(kelompokIds) ? kelompokIds : undefined,
        kategoriIds: Array.isArray(kategoriIds) ? kategoriIds : undefined,
        statusBuka,
      },
    });

    return NextResponse.json({ ok: true, jadwal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("jadwal.delete");
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

    await prisma.jadwal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
