import { getServerSession } from "next-auth";
import { connection } from "next/server";
import RolePermissionManager from "@/components/admin/RolePermissionManager";
import { authOptions } from "@/lib/auth";
import { getAllRolesWithPermissions, roleHasPermission } from "@/lib/permission-store";

export default async function RolePermissionPage() {
  await connection();
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";

  const canManage = await roleHasPermission(userRole, "role.manage");
  const { roles, assignments } = await getAllRolesWithPermissions();

  return (
    <RolePermissionManager
      initialAssignments={assignments}
      roleDefinitions={roles}
      canManage={canManage}
    />
  );
}
