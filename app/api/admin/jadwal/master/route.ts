import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

/**
 * Data master (desa, kelompok, kategori) yang dibutuhkan formulir jadwal.
 * Endpoint ini hanya menuntut izin `jadwal.view` supaya akun yang mengelola
 * jadwal (tanpa izin akses data master) tetap bisa mengisi formulir.
 * Daftar tetap dibatasi oleh scope wilayah akun.
 */
export async function GET() {
  const { error, session } = await requirePermission("jadwal.view");
  if (error) return error;

  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const desaWhere: Record<string, unknown> = {};
    const kelompokWhere: Record<string, unknown> = {};

    if (scope.kind === "desa") {
      desaWhere.id = scope.desaId;
      kelompokWhere.desaId = scope.desaId;
    }
    if (scope.kind === "kelompok") {
      kelompokWhere.id = scope.kelompokId ?? "__tidak_ada_akses__";
      const kelompok = await prisma.kelompok.findMany({
        where: { id: scope.kelompokId ?? "" },
        select: { desaId: true },
      });
      if (kelompok[0]) desaWhere.id = kelompok[0].desaId;
    }

    const [desa, kelompok, kategori] = await Promise.all([
      prisma.desa.findMany({
        where: desaWhere,
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      prisma.kelompok.findMany({
        where: kelompokWhere,
        orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
        select: {
          id: true,
          nama: true,
          desaId: true,
          desa: { select: { nama: true } },
        },
      }),
      prisma.kategori.findMany({
        orderBy: [{ urutan: "asc" }, { nama: "asc" }],
        select: { id: true, nama: true },
      }),
    ]);

    return NextResponse.json({
      desa,
      kelompok: kelompok.map((item) => ({
        id: item.id,
        nama: item.nama,
        desaId: item.desaId,
        desaNama: item.desa.nama,
      })),
      kategori,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data master.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
