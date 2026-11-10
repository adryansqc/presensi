import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateSlug(): string {
  return randomBytes(4).toString("hex"); // 8 karakter hex
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["Super_Admin", "Admin_CAI", "Desa", "Kelompok"]);
  if (error) return error;

  try {
    const { id } = await params;

    // Cek jadwal masih buka
    const jadwal = await prisma.jadwal.findUnique({ where: { id } });
    if (!jadwal) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }
    if (jadwal.statusBuka !== "Buka") {
      return NextResponse.json({ error: "Jadwal belum dibuka." }, { status: 400 });
    }

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
