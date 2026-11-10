import { prisma } from "@/lib/prisma";
import { requirePermission, requireRole } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requirePermission("jadwal.view");
  if (error) return error;

  const userRole = (session!.user as unknown as { role?: string }).role ?? "";

  try {
    const jadwal = await prisma.jadwal.findMany({
      orderBy: { tanggal: "desc" },
      include: {
        presensi: {
          include: {
            jamaah: { select: { nama: true, desa: { select: { nama: true } }, kelompok: { select: { nama: true } } } },
          },
        },
        dibuatOlehUser: { select: { name: true, email: true } },
      },
    });

    // Filter by cakupan wilayah
    let filtered = jadwal;
    if (userRole === "Desa") {
      filtered = jadwal.filter((j) => j.desaId !== undefined);
    } else if (userRole === "Kelompok") {
      filtered = jadwal.filter((j) => j.kelompokId !== undefined);
    }

    return NextResponse.json(filtered);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { error, session } = await requireRole(["Super_Admin", "Admin_CAI"]);
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";

  try {
    const body = await request.json();
    const { tanggal, jenisPengajian, jamMulai, jamSelesai, tingkat, desaId, kelompokId } = body;

    if (!tanggal || !jenisPengajian || !jamMulai || !jamSelesai || !tingkat) {
      throw new Error("Semua field wajib diisi.");
    }

    const jadwal = await prisma.jadwal.create({
      data: {
        tanggal: new Date(tanggal),
        jenisPengajian,
        jamMulai,
        jamSelesai,
        tingkat,
        desaId: desaId || null,
        kelompokId: kelompokId || null,
        statusBuka: "Tutup",
        dibuatOleh: userId,
      },
      include: {
        dibuatOlehUser: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, jadwal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
