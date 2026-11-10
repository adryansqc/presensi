import { requirePermission } from "@/lib/auth-helpers";
import { getAllRolePermissions, saveRolePermissions } from "@/lib/permission-store";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("role.manage");
  if (error) return error;

  const assignments = await getAllRolePermissions();
  return NextResponse.json({ assignments });
}

export async function PUT(request: Request) {
  const { error } = await requirePermission("role.manage");
  if (error) return error;

  try {
    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role : "";
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions.filter((item: unknown): item is string => typeof item === "string")
      : [];

    const saved = await saveRolePermissions(role, permissions);
    return NextResponse.json({ ok: true, permissions: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan hak akses.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
