import { prisma } from "@/lib/prisma";
import { assertJadwalDalamScope, getScope, getScopeMaps } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateSlug(): string {
  return randomBytes(4).toString("hex"); // 8 karakter hex
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requirePermission("jadwal.edit");
  if (error) return error;

  const userId = (session!.user as unknown as { id?: string }).id ?? "";

  try {
    const { id } = await params;

    const scope = await getScope(userId);
    if (!scope) {
      return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
    }

    // Cek jadwal masih buka
    const jadwal = await prisma.jadwal.findUnique({ where: { id } });
    if (!jadwal) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }
    if (jadwal.statusBuka !== "Buka") {
      return NextResponse.json({ error: "Jadwal belum dibuka." }, { status: 400 });
    }

    // Link publik hanya boleh dibuat untuk jadwal di dalam cakupan akun.
    assertJadwalDalamScope(
      scope,
      {
        tingkat: jadwal.tingkat,
        desaIds: jadwal.desaIds ?? [],
        kelompokIds: jadwal.kelompokIds ?? [],
      },
      await getScopeMaps(),
      "jadwal"
    );

    // Generate slug unik
    let slug = generateSlug();
    let exists = await prisma.jadwal.findUnique({ where: { slugPublik: slug } });
    while (exists) {
      slug = generateSlug();
      exists = await prisma.jadwal.findUnique({ where: { slugPublik: slug } });
    }

    const updated = await prisma.jadwal.update({
      where: { id },
      data: {
        slugPublik: slug,
        linkPublikAktif: true,
      },
    });

    const link = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/absen/${slug}`;

    return NextResponse.json({ ok: true, slug, link, jadwal: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal generate link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
