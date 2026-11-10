import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["Super_Admin", "Admin_CAI"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { tanggal, jenisPengajian, jamMulai, jamSelesai, tingkat, desaId, kelompokId, statusBuka } = body;

    const jadwal = await prisma.jadwal.update({
      where: { id },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        jenisPengajian,
        jamMulai,
        jamSelesai,
        tingkat,
        desaId: desaId || null,
        kelompokId: kelompokId || null,
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
  const { error } = await requireRole(["Super_Admin", "Admin_CAI"]);
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.jadwal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
