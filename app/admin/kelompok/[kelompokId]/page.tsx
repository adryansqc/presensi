import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import CrudManager from "@/components/admin/CrudManager";
import PermissionDenied from "@/components/admin/PermissionDenied";
import { kelompokJamaahResource } from "@/lib/admin/resources";
import { assertWithinScope, getScope } from "@/lib/admin/scope";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHasPermission } from "@/lib/permission-store";

export const dynamic = "force-dynamic";

export default async function KelompokJamaahPage({
  params,
}: {
  params: Promise<{ kelompokId: string }>;
}) {
  await connection();
  const { kelompokId } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );

  if (!scope) {
    notFound();
  }

  const canView = await roleHasPermission(role, "kelompok.view");
  const canViewJamaah = await roleHasPermission(role, "jamaah.view");

  if (!canView || !canViewJamaah) {
    return (
      <PermissionDenied message="Role Anda tidak memiliki izin untuk melihat daftar jazmah kelompok." />
    );
  }

  const kelompok = await prisma.kelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      nama: true,
      aktif: true,
      desaId: true,
      desa: { select: { nama: true } },
    },
  });

  if (!kelompok) {
    notFound();
  }

  try {
    assertWithinScope(
      scope,
      { desaId: kelompok.desaId, kelompokId: kelompok.id },
      "jamaah"
    );
  } catch {
    notFound();
  }

  const config = await kelompokJamaahResource(kelompokId, scope);
  if (!config) {
    notFound();
  }

  const canCreate = await roleHasPermission(role, "jamaah.create");
  const canEdit = await roleHasPermission(role, "jamaah.edit");
  const canDelete = await roleHasPermission(role, "jamaah.delete");

  const rows = await config.list(scope);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/kelompok"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Kembali ke daftar kelompok
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {kelompok.nama}
          </h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
            {kelompok.desa.nama}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              kelompok.aktif
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            {kelompok.aktif ? "Aktif" : "Nonaktif"}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Daftar anggota kelompok {kelompok.nama}. Tambah, ubah, atau hapus anggota
          langsung dari halaman ini.
        </p>
      </div>

      <CrudManager
        resource="jamaah"
        endpoint={`/api/admin/kelompok/${kelompokId}/jamaah`}
        title="Jamaah"
        singular="Jamaah"
        description={config.description}
        columns={config.columns}
        fields={config.fields}
        searchKeys={config.searchKeys}
        initialRows={rows}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
