import { deleteRole } from "@/lib/permission-store";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { error } = await requirePermission("role.manage");
  if (error) return error;

  try {
    const { name } = await params;
    await deleteRole(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus role.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
