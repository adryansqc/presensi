import { createRole, getAllRolesWithPermissions } from "@/lib/permission-store";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("role.manage");
  if (error) return error;

  try {
    const { roles, assignments } = await getAllRolesWithPermissions();
    return NextResponse.json({ roles, assignments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat role.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("role.manage");
  if (error) return error;

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions.filter((item: unknown): item is string => typeof item === "string")
      : [];

    if (!name) {
      throw new Error("Nama role wajib diisi.");
    }

    await createRole(name, permissions);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat role.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
