import { toErrorMessage } from "@/lib/admin/api-error";
import { getResource } from "@/lib/admin/resources";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const { error, session } = await requirePermission(`${resource}.view`);
  if (error) return error;

  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  const config = await getResource(resource, scope);
  if (!config) {
    return NextResponse.json({ error: "Resource tidak dikenal." }, { status: 404 });
  }

  const rows = await config.list(scope);
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const { error, session } = await requirePermission(`${resource}.create`);
  if (error) return error;

  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );
  if (!scope) {
    return NextResponse.json({ error: "Data akun tidak ditemukan." }, { status: 403 });
  }

  const config = await getResource(resource, scope);
  if (!config) {
    return NextResponse.json({ error: "Resource tidak dikenal." }, { status: 404 });
  }

  try {
    const body = await request.json();
    await config.create(body ?? {}, scope);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}
