import { NextResponse } from "next/server";
import { toErrorMessage } from "@/lib/admin/api-error";
import { kelompokJamaahResource } from "@/lib/admin/resources";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ kelompokId: string; jamaahId: string }> }
) {
  const { kelompokId, jamaahId } = await params;
  const { error, session } = await requirePermission("jamaah.edit");
  if (error) return error;

  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const config = await kelompokJamaahResource(kelompokId, scope);
    if (!config) {
      return NextResponse.json({ error: "Kelompok tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json();
    await config.update(jamaahId, body ?? {}, scope);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ kelompokId: string; jamaahId: string }> }
) {
  const { kelompokId, jamaahId } = await params;
  const { error, session } = await requirePermission("jamaah.delete");
  if (error) return error;

  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  try {
    const config = await kelompokJamaahResource(kelompokId, scope);
    if (!config) {
      return NextResponse.json({ error: "Kelompok tidak ditemukan." }, { status: 404 });
    }

    await config.remove(jamaahId, scope);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}
