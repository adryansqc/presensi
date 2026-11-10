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
      },
    });

    if (!jadwal) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ jadwal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
