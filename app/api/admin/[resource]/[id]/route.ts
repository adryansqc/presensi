import { toErrorMessage } from "@/lib/admin/api-error";
import { getResource } from "@/lib/admin/resources";
import { getScope } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const { error, session } = await requirePermission(`${resource}.edit`);
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
    await config.update(id, body ?? {}, scope);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const { error, session } = await requirePermission(`${resource}.delete`);
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

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (resource === "pengguna" && currentUserId === id) {
    return NextResponse.json(
      { error: "Anda tidak dapat menghapus akun yang sedang digunakan." },
      { status: 400 }
    );
  }

  try {
    await config.remove(id, scope);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 400 });
  }
}
