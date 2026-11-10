import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

type PresensiBody = {
  jadwalId: string;
  jamaahId?: string;
  namaJamaah?: string;
  kategoriId?: string;
  desaId?: string;
  kelompokId?: string;
  status?: string;
  keterangan?: string;
  lintasKelompok?: boolean;
};

export async function GET(request: Request) {
  const { error, session } = await requirePermission("presensi.view");
  if (error) return error;

  const userRole = (session!.user as unknown as { role?: string }).role ?? "";
  const desaId = (session!.user as unknown as { desaId?: string }).desaId ?? null;
  const kelompokId = (session!.user as unknown as { kelompokId?: string }).kelompokId ?? null;

  const { searchParams } = new URL(request.url);
  const jadwalId = searchParams.get("jadwalId");

  try {
    const where: Record<string, unknown> = {};
    if (jadwalId) where.jadwalId = jadwalId;

    // Filter by cakupan wilayah
    if (userRole === "Desa" && desaId) {
      where.desaId = desaId;
    } else if (userRole === "Kelompok" && kelompokId) {
      where.kelompokId = kelompokId;
    }

    const presensi = await prisma.presensi.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        jadwal: { select: { jenisPengajian: true, tanggal: true, statusBuka: true } },
        jamaah: { select: { nama: true, noWa: true, desa: { select: { nama: true } }, kelompok: { select: { nama: true } } } },
        dicatatOlehUser: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(presensi);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat presensi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { error, session } = await requirePermission("presensi.create");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";
  const userRole = (session!.user as unknown as { role?: string }).role ?? "";
  const userDesaId = (session!.user as unknown as { desaId?: string }).desaId ?? null;
  const userKelompokId = (session!.user as unknown as { kelompokId?: string }).kelompokId ?? null;

  try {
    const body = (await request.json()) as PresensiBody;
    const { jadwalId, jamaahId, namaJamaah, kategoriId, desaId, kelompokId, status, keterangan, lintasKelompok } = body;

    if (!jadwalId || !status) {
      throw new Error("Field wajib tidak lengkap.");
    }

    if (!["Hadir", "Izin", "Sakit"].includes(status)) {
      throw new Error("Status tidak valid.");
    }

    // Resolve kategoriId, desaId, kelompokId, dan namaJamaah dari data jamaah jika jamaahId diberikan
    let resolvedKategoriId = kategoriId;
    let resolvedDesaId = desaId;
    let resolvedKelompokId = kelompokId;
    let resolvedNamaJamaah = namaJamaah || "";

    if (jamaahId) {
      const jamaah = await prisma.jamaah.findUnique({ where: { id: jamaahId } });
      if (!jamaah) throw new Error("Jamaah tidak ditemukan.");
      resolvedKategoriId = jamaah.kategoriId;
      resolvedDesaId = jamaah.desaId;
      resolvedKelompokId = jamaah.kelompokId;
      resolvedNamaJamaah = jamaah.nama;
    }

    // Verifikasi jadwal masih buka
    const jadwal = await prisma.jadwal.findUnique({ where: { id: jadwalId } });
    if (!jadwal) throw new Error("Jadwal tidak ditemukan.");
    if (jadwal.statusBuka !== "Buka") throw new Error("Jadwal sudah ditutup.");

    // Verifikasi cakupan wilayah untuk non-Super Admin/Daerah
    if (userRole === "Desa" && userDesaId && resolvedDesaId !== userDesaId) {
      throw new Error("Anda hanya dapat mengabsen jamaah di desa Anda.");
    }
    if (userRole === "Kelompok" && userKelompokId && resolvedKelompokId !== userKelompokId && !lintasKelompok) {
      throw new Error("Anda hanya dapat mengabsen jamaah di kelompok Anda.");
    }

    const payload = {
      namaJamaah: resolvedNamaJamaah,
      jamaahId: jamaahId || null,
      kategoriId: resolvedKategoriId || "",
      desaId: resolvedDesaId || "",
      kelompokId: resolvedKelompokId || "",
      status,
      keterangan: keterangan || null,
      sumber: "PENGURUS",
      dicatatOleh: userId,
      lintasKelompok: lintasKelompok === true,
    };

    // Cek apakah sudah ada presensi untuk jamaah ini di jadwal ini
    const existing = jamaahId
      ? await prisma.presensi.findFirst({ where: { jadwalId, jamaahId } })
      : null;

    if (existing) {
      const presensi = await prisma.presensi.update({
        where: { id: existing.id },
        data: payload as never,
        include: {
          jadwal: { select: { jenisPengajian: true, tanggal: true } },
          jamaah: { select: { nama: true } },
          dicatatOlehUser: { select: { name: true } },
        },
      });
      return NextResponse.json({ ok: true, presensi }, { status: 200 });
    }

    const presensi = await prisma.presensi.create({
      data: { ...payload, jadwalId } as never,
      include: {
        jadwal: { select: { jenisPengajian: true, tanggal: true } },
        jamaah: { select: { nama: true } },
        dicatatOlehUser: { select: { name: true } },
      },
    });
    return NextResponse.json({ ok: true, presensi }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan presensi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
