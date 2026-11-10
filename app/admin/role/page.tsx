import { getServerSession } from "next-auth";
import { connection } from "next/server";
import RolePermissionManager from "@/components/admin/RolePermissionManager";
import { authOptions } from "@/lib/auth";
import { getAllRolePermissions, roleHasPermission } from "@/lib/permission-store";

export default async function RolePermissionPage() {
  await connection();
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";

  const canManage = await roleHasPermission(role, "role.manage");
  const assignments = await getAllRolePermissions();

  return <RolePermissionManager initialAssignments={assignments} canManage={canManage} />;
}
