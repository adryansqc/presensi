import { getResource } from "@/lib/admin/resources";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

function toErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    switch ((error as { code?: string }).code) {
      case "P2002":
        return "Data dengan nilai tersebut sudah ada. Periksa kembali nama atau email.";
      case "P2003":
        return "Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.";
      case "P2025":
        return "Data tidak ditemukan.";
    }
  }

  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan pada server.";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const { error } = await requirePermission(`${resource}.view`);
  if (error) return error;

  const config = await getResource(resource);
  if (!config) {
    return NextResponse.json({ error: "Resource tidak dikenal." }, { status: 404 });
  }

  const rows = await config.list();
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const { error } = await requirePermission(`${resource}.create`);
  if (error) return error;

  const config = await getResource(resource);
  if (!config) {
    return NextResponse.json({ error: "Resource tidak dikenal." }, { status: 404 });
  }

  try {
    const body = await request.json();
    await config.create(body ?? {});
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}
