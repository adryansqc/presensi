import { NextResponse } from "next/server";
import { toErrorMessage } from "@/lib/admin/api-error";
import { kelompokJamaahResource } from "@/lib/admin/resources";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kelompokId: string }> }
) {
  const { kelompokId } = await params;
  const { error, session } = await requirePermission("jamaah.view");
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

    const rows = await config.list(scope);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 403 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kelompokId: string }> }
) {
  const { kelompokId } = await params;
  const { error, session } = await requirePermission("jamaah.create");
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
    await config.create(body ?? {}, scope);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}
