import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/csv";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error } = await requirePermission("jamaah.create");
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("File CSV tidak ditemukan.");

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV kosong atau hanya berisi header.");

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const index = (name: string) => header.indexOf(name);

    const namaIdx = index("nama");
    const desaIdx = index("desa");
    const kelompokIdx = index("kelompok");
    const kategoriIdx = index("kategori");
    const noWaIdx = index("nowa");

    if (namaIdx === -1 || kelompokIdx === -1 || kategoriIdx === -1) {
      throw new Error('CSV harus memiliki kolom: nama, kelompok, dan kategori.');
    }

    const kategoris = await prisma.kategori.findMany({
      where: { aktif: true },
      select: { id: true, nama: true },
    });
    const kelompoks = await prisma.kelompok.findMany({
      where: { aktif: true },
      include: { desa: { select: { id: true, nama: true } } },
    });

    const kategoriMap = new Map(
      kategoris.map((k) => [k.nama.toLowerCase().trim(), k.id])
    );
    const kelompokMap = new Map(
      kelompoks.map((k) => [k.nama.toLowerCase().trim(), k])
    );

    let success = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nama = row[namaIdx]?.trim();
      const desaNama = row[desaIdx]?.trim();
      const kelompokNama = row[kelompokIdx]?.trim();
      const kategoriNama = row[kategoriIdx]?.trim();
      const noWa = row[noWaIdx]?.trim() || null;

      if (!nama) {
        errors.push({ row: i + 1, message: "Nama kosong." });
        continue;
      }

      const kategoriId = kategoriNama
        ? kategoriMap.get(kategoriNama.toLowerCase().trim())
        : null;
      if (!kategoriId) {
        errors.push({
          row: i + 1,
          message: `Kategori "${kategoriNama ?? "-"}" tidak ditemukan.`,
        });
        continue;
      }

      const kelompok = kelompokNama
        ? kelompokMap.get(kelompokNama.toLowerCase().trim())
        : null;
      if (!kelompok) {
        errors.push({
          row: i + 1,
          message: `Kelompok "${kelompokNama ?? "-"}" tidak ditemukan.`,
        });
        continue;
      }

      if (desaNama && kelompok.desa.nama.toLowerCase().trim() !== desaNama.toLowerCase().trim()) {
        errors.push({
          row: i + 1,
          message: `Desa "${desaNama}" tidak cocok dengan kelompok "${kelompokNama}" (desa kelompok: ${kelompok.desa.nama}).`,
        });
        continue;
      }

      await prisma.jamaah.create({
        data: {
          nama,
          kategoriId,
          kelompokId: kelompok.id,
          desaId: kelompok.desa.id,
          noWa,
          statusAktif: "Aktif",
        },
      });
      success++;
    }

    return NextResponse.json({ ok: true, success, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengimpor CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
