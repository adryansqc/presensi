import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

type BulkItem = {
  jamaahId?: string;
  namaJamaah?: string;
  kategoriId?: string;
  desaId?: string;
  kelompokId?: string;
  status?: string;
  keterangan?: string;
};

type BulkBody = {
  jadwalId: string;
  items: BulkItem[];
};

const VALID_STATUS = new Set(["Hadir", "Izin", "Sakit"]);

export async function POST(request: Request) {
  const { error, session } = await requirePermission("presensi.create");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";
  const scope = await getScope(userId);
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as BulkBody;
    const { jadwalId, items = [] } = body;

    if (!jadwalId || !Array.isArray(items) || items.length === 0) {
      throw new Error("Field wajib tidak lengkap.");
    }

    // 1. Verifikasi jadwal masih buka (1 kueri)
    const jadwal = await prisma.jadwal.findUnique({ where: { id: jadwalId } });
    if (!jadwal) throw new Error("Jadwal tidak ditemukan.");
    if (jadwal.statusBuka !== "Buka") throw new Error("Jadwal sudah ditutup.");

    // 2. Ambil data jamaah yang direferensikan sekaligus (1 kueri)
    const jamaahIds = items.map((i) => i.jamaahId).filter((id): id is string => Boolean(id));
    const jamaahMap = new Map<string, { kategoriId: string; desaId: string; kelompokId: string; nama: string }>();
    if (jamaahIds.length) {
      const jamaahList = await prisma.jamaah.findMany({
        where: { id: { in: jamaahIds } },
        select: { id: true, kategoriId: true, desaId: true, kelompokId: true, nama: true },
      });
      for (const j of jamaahList) {
        jamaahMap.set(j.id, j);
      }
    }

    // 3. Cek presensi yang sudah ada untuk jadwal ini (1 kueri)
    const existingMap = new Map<string, { id: string }>();
    if (jamaahIds.length) {
      const existing = await prisma.presensi.findMany({
        where: { jadwalId, jamaahId: { in: jamaahIds } },
        select: { id: true, jamaahId: true },
      });
      for (const e of existing) {
        if (e.jamaahId) existingMap.set(e.jamaahId, e);
      }
    }

    // 4. Bangun operasi create/update, jalankan dalam satu transaksi
    const ops: ReturnType<typeof prisma.presensi.create>[] = [];

    for (const item of items) {
      const { jamaahId, namaJamaah, kategoriId, desaId, kelompokId, status, keterangan } = item;

      if (!status || !VALID_STATUS.has(status)) continue;

      let resolvedKategoriId = kategoriId || "";
      let resolvedDesaId = desaId || "";
      let resolvedKelompokId = kelompokId || "";
      let resolvedNamaJamaah = namaJamaah || "";

      const jamaah = jamaahId ? jamaahMap.get(jamaahId) : undefined;
      if (jamaah) {
        resolvedKategoriId = jamaah.kategoriId;
        resolvedDesaId = jamaah.desaId;
        resolvedKelompokId = jamaah.kelompokId;
        resolvedNamaJamaah = jamaah.nama;
      }

      // Verifikasi cakupan wilayah
      if (scope.kind !== "all") {
        if (scope.kind === "none") {
          throw new Error("Akun Anda belum ditugaskan ke desa atau kelompok mana pun.");
        }
        if (scope.kind === "kelompok" && resolvedKelompokId !== scope.kelompokId) {
          throw new Error(`Jamaah di luar cakupan kelompok Anda.`);
        }
        if (scope.kind === "desa" && resolvedDesaId !== scope.desaId) {
          throw new Error(`Jamaah di luar cakupan desa Anda.`);
        }
      }

      const payload = {
        namaJamaah: resolvedNamaJamaah,
        jamaahId: jamaahId || null,
        kategoriId: resolvedKategoriId,
        desaId: resolvedDesaId,
        kelompokId: resolvedKelompokId,
        status,
        keterangan: keterangan || null,
        sumber: "PENGURUS",
        dicatatOleh: userId,
        lintasKelompok: false,
        jadwalId,
      } as never;

      const existing = jamaahId ? existingMap.get(jamaahId) : null;
      if (existing) {
        ops.push(prisma.presensi.update({ where: { id: existing.id }, data: payload }));
      } else {
        ops.push(prisma.presensi.create({ data: payload }));
      }
    }

    if (ops.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    await prisma.$transaction(ops, { timeout: 30000 });

    return NextResponse.json({ ok: true, count: ops.length }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan presensi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
