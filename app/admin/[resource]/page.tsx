import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import CrudManager from "@/components/admin/CrudManager";
import PermissionDenied from "@/components/admin/PermissionDenied";
import { getResource } from "@/lib/admin/resources";
import { getScope } from "@/lib/admin/scope";
import { authOptions } from "@/lib/auth";
import { roleHasPermission } from "@/lib/permission-store";

export const dynamic = "force-dynamic";

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  await connection();
  const { resource } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const scope = await getScope(
    (session?.user as { id?: string } | undefined)?.id
  );

  if (!scope) {
    notFound();
  }

  const config = await getResource(resource, scope);

  if (!config) {
    notFound();
  }

  const canView = await roleHasPermission(role, `${resource}.view`);
  const canCreate = await roleHasPermission(role, `${resource}.create`);
  const canEdit = await roleHasPermission(role, `${resource}.edit`);
  const canDelete = await roleHasPermission(role, `${resource}.delete`);

  if (!canView) {
    return (
      <PermissionDenied message={`Role Anda tidak memiliki izin untuk melihat data ${config.label.toLowerCase()}.`} />
    );
  }

  const rows = await config.list(scope);

  return (
    <CrudManager
      resource={config.key}
      endpoint={`/api/admin/${config.key}`}
      title={config.label}
      singular={config.singular}
      description={config.description}
      columns={config.columns}
      fields={config.fields}
      searchKeys={config.searchKeys}
      initialRows={rows}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      importUrl={resource === "jamaah" ? "/admin/jamaah/import" : undefined}
    />
  );
}
