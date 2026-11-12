import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const jadwal = await prisma.jadwal.findFirst({
      where: { slugPublik: slug, linkPublikAktif: true },
      select: {
        id: true,
        tanggal: true,
        jenisPengajian: true,
        jamMulai: true,
        jamSelesai: true,
        tingkat: true,
        statusBuka: true,
        slugPublik: true,
        desaIds: true,
        kelompokIds: true,
        kategoriIds: true,
      },
    });

    if (!jadwal) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    // Desa & kelompok yang boleh dipilih mengikuti cakupan jadwal:
    // - jadwal tingkat Kelompok : hanya kelompok yang ditunjuk
    // - jadwal tingkat Desa     : desa yang ditunjuk + seluruh kelompoknya
    // - jadwal tingkat Daerah   : seluruh desa & kelompok
    const [allDesa, allKelompok] = await Promise.all([
      prisma.desa.findMany({
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      prisma.kelompok.findMany({
        orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
        select: {
          id: true,
          nama: true,
          desaId: true,
          desa: { select: { nama: true } },
        },
      }),
    ]);

    const kelompokIds = jadwal.kelompokIds ?? [];
    const desaIds = jadwal.desaIds ?? [];

    const kelompokTersedia =
      kelompokIds.length > 0
        ? allKelompok.filter((k) => kelompokIds.includes(k.id))
        : desaIds.length > 0
          ? allKelompok.filter((k) => desaIds.includes(k.desaId))
          : allKelompok;

    const desaTersedia =
      kelompokIds.length > 0
        ? allDesa.filter((d) => kelompokTersedia.some((k) => k.desaId === d.id))
        : desaIds.length > 0
          ? allDesa.filter((d) => desaIds.includes(d.id))
          : allDesa;

    return NextResponse.json({
      jadwal: {
        ...jadwal,
        desa: desaTersedia,
        kelompok: kelompokTersedia.map((k) => ({
          id: k.id,
          nama: k.nama,
          desaId: k.desaId,
          desaNama: k.desa.nama,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
