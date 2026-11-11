import { prisma } from "@/lib/prisma";
import { requirePermission, requireRole } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requirePermission("jadwal.view");
  if (error) return error;

  const userRole = (session!.user as unknown as { role?: string }).role ?? "";
  const userDesaId = (session!.user as unknown as { desaId?: string }).desaId ?? null;
  const userKelompokId = (session!.user as unknown as { kelompokId?: string }).kelompokId ?? null;

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
    if (userRole === "Desa" && userDesaId) {
      filtered = jadwal.filter((j) => Array.isArray(j.desaIds) && j.desaIds.includes(userDesaId));
    } else if (userRole === "Kelompok" && userKelompokId) {
      filtered = jadwal.filter((j) => Array.isArray(j.kelompokIds) && j.kelompokIds.includes(userKelompokId));
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
    const { tanggal, jenisPengajian, jamMulai, jamSelesai, tingkat, desaIds, kelompokIds, kategoriIds } = body;

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
        desaIds: Array.isArray(desaIds) ? desaIds : [],
        kelompokIds: Array.isArray(kelompokIds) ? kelompokIds : [],
        kategoriIds: Array.isArray(kategoriIds) ? kategoriIds : [],
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
