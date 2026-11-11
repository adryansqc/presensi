import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jadwalId: string }> }
) {
  try {
    const { jadwalId } = await params;

    const jadwal = await prisma.jadwal.findFirst({
      where: { id: jadwalId, linkPublikAktif: true },
      select: { id: true },
    });

    if (!jadwal) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    const presensi = await prisma.presensi.findMany({
      where: { jadwalId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        jamaah: { select: { nama: true, desa: { select: { nama: true } }, kelompok: { select: { nama: true } } } },
      },
    });

    const total = presensi.length;
    const hadir = presensi.filter((p) => p.status === "Hadir").length;
    const izin = presensi.filter((p) => p.status === "Izin").length;
    const sakit = presensi.filter((p) => p.status === "Sakit").length;
    const sumberPublik = presensi.filter((p) => p.sumber === "PUBLIK").length;

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
      total,
      hadir,
      izin,
      sakit,
      sumberPublik,
      rincianDesa,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat rekap.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
