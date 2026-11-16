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
        jamaah: { select: { nama: true, desaId: true, kelompokId: true, desa: { select: { nama: true } }, kelompok: { select: { nama: true } } } },
      },
    });

    const allDesa = await prisma.desa.findMany({ select: { id: true, nama: true } });
    const allKelompok = await prisma.kelompok.findMany({ select: { id: true, nama: true } });
    const desaLookup = new Map(allDesa.map((d) => [d.id, d.nama]));
    const kelompokLookup = new Map(allKelompok.map((k) => [k.id, k.nama]));

    const total = presensi.length;
    const hadir = presensi.filter((p) => p.status === "Hadir").length;
    const izin = presensi.filter((p) => p.status === "Izin").length;
    const sakit = presensi.filter((p) => p.status === "Sakit").length;
    const sumberPublik = presensi.filter((p) => p.sumber === "PUBLIK").length;

    const grouped = new Map<string, Map<string, { hadir: number; izin: number; sakit: number; total: number }>>();
    for (const p of presensi) {
      let dNama: string;
      let kNama: string;
      if (p.jamaah) {
        dNama = (p.jamaah.desa?.nama ?? desaLookup.get(p.jamaah.desaId) ?? "").trim() || "Tidak diketahui";
        kNama = (p.jamaah.kelompok?.nama ?? kelompokLookup.get(p.jamaah.kelompokId) ?? "").trim() || "Tidak diketahui";
      } else {
        dNama = (desaLookup.get(p.desaId) ?? "").trim() || "Tidak diketahui";
        kNama = (kelompokLookup.get(p.kelompokId) ?? "").trim() || "Tidak diketahui";
      }
      if (!grouped.has(dNama)) grouped.set(dNama, new Map());
      const kelompokMap = grouped.get(dNama)!;
      if (!kelompokMap.has(kNama)) kelompokMap.set(kNama, { hadir: 0, izin: 0, sakit: 0, total: 0 });
      const stats = kelompokMap.get(kNama)!;
      stats.total++;
      if (p.status === "Hadir") stats.hadir++;
      if (p.status === "Izin") stats.izin++;
      if (p.status === "Sakit") stats.sakit++;
    }

    const rincianDesa = Array.from(grouped.entries()).map(([desa, kelompokMap]) => ({
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
