import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["Super_Admin", "Admin_CAI", "Desa", "Kelompok"]);
  if (error) return error;

  try {
    const { id } = await params;
    const jadwal = await prisma.jadwal.update({
      where: { id },
      data: { statusBuka: "Tutup", ditutupPada: new Date() },
    });

    return NextResponse.json({ ok: true, jadwal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menutup sesi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
