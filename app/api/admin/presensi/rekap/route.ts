import { prisma } from "@/lib/prisma";
import { getScope, scopedWhere } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error, session } = await requirePermission("presensi.view");
  if (error) return error;

  const scope = await getScope((session!.user as unknown as { id?: string }).id);
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const jadwalId = searchParams.get("jadwalId");

  try {
    const where: Record<string, unknown> = { ...scopedWhere(scope) };
    if (jadwalId) where.jadwalId = jadwalId;

    const presensi = await prisma.presensi.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        jadwal: { select: { jenisPengajian: true, tanggal: true, statusBuka: true } },
        jamaah: { select: { nama: true, desa: { select: { nama: true } }, kelompok: { select: { nama: true } } } },
        dicatatOlehUser: { select: { name: true } },
      },
    });

    // Hitung agregat
    const total = presensi.length;
    const hadir = presensi.filter((p) => p.status === "Hadir").length;
    const izin = presensi.filter((p) => p.status === "Izin").length;
    const sakit = presensi.filter((p) => p.status === "Sakit").length;
    const sumberPengurus = presensi.filter((p) => p.sumber === "PENGURUS").length;
    const sumberPublik = presensi.filter((p) => p.sumber === "PUBLIK").length;

    // Rincian per desa -> per kelompok
    const desaMap = new Map<string, Map<string, { hadir: number; izin: number; sakit: number; total: number }>>();
    for (const p of presensi) {
      const dNama = p.jamaah?.desa?.nama ?? "Tidak diketahui";
      const kNama = p.jamaah?.kelompok?.nama ?? "Tidak diketahui";
      if (!desaMap.has(dNama)) desaMap.set(dNama, new Map());
      const kelompokMap = desaMap.get(dNama)!;
      if (!kelompokMap.has(kNama)) kelompokMap.set(kNama, { hadir: 0, izin: 0, sakit: 0, total: 0 });
      const stats = kelompokMap.get(kNama)!;
      stats.total++;
      if (p.status === "Hadir") stats.hadir++;
      if (p.status === "Izin") stats.izin++;
      if (p.status === "Sakit") stats.sakit++;
    }

    const rincianDesa = Array.from(desaMap.entries()).map(([desa, kelompokMap]) => ({
      desa,
      kelompok: Array.from(kelompokMap.entries()).map(([kelompok, stats]) => ({ kelompok, ...stats })),
    }));

    return NextResponse.json({
      jadwalId,
      total,
      hadir,
      izin,
      sakit,
      sumberPengurus,
      sumberPublik,
      rincianDesa,
      presensi,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat rekap.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
