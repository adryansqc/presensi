import { prisma } from "@/lib/prisma";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  isKnownPermission,
  ROLES,
} from "@/lib/permissions";

function sanitize(permissions: string[]) {
  return Array.from(new Set(permissions.filter(isKnownPermission)));
}

export async function getRolePermissions(role: string): Promise<string[]> {
  const definition = ROLES.find((item) => item.value === role);

  if (definition?.locked) {
    return [...ALL_PERMISSION_KEYS];
  }

  const row = await prisma.role.findUnique({ where: { name: role } });
  const permissions = row
    ? row.permissions
    : DEFAULT_ROLE_PERMISSIONS[role] ?? [];

  return sanitize(permissions);
}

export async function roleHasPermission(role: string, permission: string) {
  const permissions = await getRolePermissions(role);
  return permissions.includes(permission);
}

export async function getAllRolePermissions(): Promise<Record<string, string[]>> {
  const rows = await prisma.role.findMany();
  const result: Record<string, string[]> = {};

  for (const definition of ROLES) {
    if (definition.locked) {
      result[definition.value] = [...ALL_PERMISSION_KEYS];
      continue;
    }

    const row = rows.find((item) => item.name === definition.value);
    result[definition.value] = sanitize(
      row ? row.permissions : DEFAULT_ROLE_PERMISSIONS[definition.value] ?? []
    );
  }

  return result;
}

export async function saveRolePermissions(role: string, permissions: string[]) {
  const definition = ROLES.find((item) => item.value === role);

  if (!definition) {
    throw new Error("Role tidak dikenal.");
  }

  if (definition.locked) {
    throw new Error("Hak akses Super Admin tidak dapat diubah.");
  }

  const cleaned = sanitize(permissions);

  await prisma.role.upsert({
    where: { name: role },
    create: { name: role, permissions: cleaned },
    update: { permissions: cleaned },
  });

  return cleaned;
}
