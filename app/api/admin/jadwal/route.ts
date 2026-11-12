import { prisma } from "@/lib/prisma";
import {
  assertJadwalDalamScope,
  getScope,
  getScopeMaps,
  jadwalVisible,
  type ScopeMaps,
} from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requirePermission("jadwal.view");
  if (error) return error;

  const scope = await getScope((session!.user as unknown as { id?: string }).id);
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

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

    // Filter by cakupan wilayah akun
    const kelompokList = await prisma.kelompok.findMany({
      select: { id: true, desaId: true },
    });
    const maps: ScopeMaps = {
      kelompokToDesa: new Map(kelompokList.map((k) => [k.id, k.desaId] as const)),
    };

    // Resolusi nama kategori & lokasi di server supaya tabel tetap menampilkan
    // nama (bukan ID) walaupun akun tidak punya izin akses data master.
    const [kategoriList, namaKelompokList, namaDesaList] = await Promise.all([
      prisma.kategori.findMany({ select: { id: true, nama: true } }),
      prisma.kelompok.findMany({
        select: { id: true, nama: true, desaId: true, desa: { select: { nama: true } } },
      }),
      prisma.desa.findMany({ select: { id: true, nama: true } }),
    ]);
    const kategoriMap = new Map(kategoriList.map((k) => [k.id, k.nama] as const));
    const kelompokNamaMap = new Map(namaKelompokList.map((k) => [k.id, k.nama] as const));
    const desaNamaMap = new Map(namaDesaList.map((d) => [d.id, d.nama] as const));

    const filtered = jadwal.filter((j) =>
      jadwalVisible(
        scope,
        {
          tingkat: j.tingkat,
          desaIds: Array.isArray(j.desaIds) ? j.desaIds : [],
          kelompokIds: Array.isArray(j.kelompokIds) ? j.kelompokIds : [],
        },
        maps
      )
    );

    return NextResponse.json(
      filtered.map((j) => {
        const kategoriIds = Array.isArray(j.kategoriIds) ? j.kategoriIds : [];
        const desaIds = Array.isArray(j.desaIds) ? j.desaIds : [];
        const kelompokIds = Array.isArray(j.kelompokIds) ? j.kelompokIds : [];

        const kategoriNama = kategoriIds
          .map((id) => kategoriMap.get(id))
          .filter(Boolean) as string[];
        const kelompokNama = kelompokIds
          .map((id) => kelompokNamaMap.get(id))
          .filter(Boolean) as string[];
        const desaNama = desaIds.map((id) => desaNamaMap.get(id)).filter(Boolean) as string[];

        const lokasiNama =
          kelompokNama.length > 0
            ? kelompokNama.join(", ")
            : desaNama.length > 0
              ? desaNama.join(", ")
              : "Daerah";

        return {
          ...j,
          kategoriNama,
          kelompokNama,
          desaNama,
          lokasiNama,
        };
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { error, session } = await requirePermission("jadwal.create");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";

  const scope = await getScope(userId);
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tanggal, jenisPengajian, jamMulai, jamSelesai, tingkat, desaIds, kelompokIds, kategoriIds } = body;

    if (!tanggal || !jenisPengajian || !jamMulai || !jamSelesai || !tingkat) {
      throw new Error("Semua field wajib diisi.");
    }

    const targetDesaIds = Array.isArray(desaIds) ? desaIds : [];
    const targetKelompokIds = Array.isArray(kelompokIds) ? kelompokIds : [];

    // Cakupan wilayah dibatasi sesuai akun (Super Admin/Admin CAI bebas).
    assertJadwalDalamScope(
      scope,
      { tingkat, desaIds: targetDesaIds, kelompokIds: targetKelompokIds },
      await getScopeMaps()
    );

    const jadwal = await prisma.jadwal.create({
      data: {
        tanggal: new Date(tanggal),
        jenisPengajian,
        jamMulai,
        jamSelesai,
        tingkat,
        desaIds: targetDesaIds,
        kelompokIds: targetKelompokIds,
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
