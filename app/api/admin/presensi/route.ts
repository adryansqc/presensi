import { prisma } from "@/lib/prisma";
import { assertWithinScope, getScope, scopedWhere } from "@/lib/admin/scope";
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
};

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
  const scope = await getScope(userId);
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as PresensiBody;
    const { jadwalId, jamaahId, namaJamaah, kategoriId, desaId, kelompokId, status, keterangan } = body;

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

    // Verifikasi cakupan wilayah: admin Desa/Kelompok hanya boleh mengabsen
    // jamaah yang berada di wilayahnya sendiri.
    assertWithinScope(
      scope,
      { desaId: resolvedDesaId, kelompokId: resolvedKelompokId },
      "jamaah"
    );

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
      lintasKelompok: false,
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
