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

export async function getAllRoleDefinitions() {
  const dbRoles = await prisma.role.findMany();
  const staticValues = new Set(ROLES.map((role) => role.value));
  const definitions = [];
  for (const role of ROLES) {
    definitions.push({
      value: role.value,
      label: role.label,
      description: role.description,
      locked: Boolean(role.locked),
    });
  }
  for (const dbRole of dbRoles) {
    if (!staticValues.has(dbRole.name)) {
      definitions.push({
        value: dbRole.name,
        label: dbRole.name,
        description: "Role dinamis",
        locked: false,
      });
    }
  }
  return definitions;
}

export async function getRolePermissions(role: string): Promise<string[]> {
  const definitions = await getAllRoleDefinitions();
  const definition = definitions.find((item) => item.value === role);
  if (definition?.locked) {
    return [...ALL_PERMISSION_KEYS];
  }
  const row = await prisma.role.findUnique({ where: { name: role } });
  const permissions = row ? row.permissions : DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  return sanitize(permissions);
}

export async function roleHasPermission(role: string, permission: string) {
  const permissions = await getRolePermissions(role);
  return permissions.includes(permission);
}

export async function getAllRolePermissions(): Promise<Record<string, string[]>> {
  const definitions = await getAllRoleDefinitions();
  const rows = await prisma.role.findMany();
  const result: Record<string, string[]> = {};

  for (const definition of definitions) {
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

export async function getAllRolesWithPermissions() {
  const definitions = await getAllRoleDefinitions();
  const rows = await prisma.role.findMany();
  const assignments: Record<string, string[]> = {};
  const roles = [];

  for (const definition of definitions) {
    if (definition.locked) {
      assignments[definition.value] = [...ALL_PERMISSION_KEYS];
    } else {
      const row = rows.find((item) => item.name === definition.value);
      assignments[definition.value] = sanitize(
        row ? row.permissions : DEFAULT_ROLE_PERMISSIONS[definition.value] ?? []
      );
    }
    roles.push({
      value: definition.value,
      label: definition.label,
      locked: definition.locked,
      permissions: assignments[definition.value],
    });
  }

  return { roles, assignments };
}

export async function saveRolePermissions(role: string, permissions: string[]) {
  const definitions = await getAllRoleDefinitions();
  const definition = definitions.find((item) => item.value === role);
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

export async function createRole(name: string, permissions: string[]) {
  const definitions = await getAllRoleDefinitions();
  if (definitions.some((item) => item.value === name)) {
    throw new Error("Role sudah digunakan.");
  }
  const cleaned = sanitize(permissions);
  const role = await prisma.role.create({ data: { name, permissions: cleaned } });
  return role;
}

export async function deleteRole(name: string) {
  const definitions = await getAllRoleDefinitions();
  const definition = definitions.find((item) => item.value === name);
  if (!definition) {
    throw new Error("Role tidak ditemukan.");
  }
  if (definition.locked) {
    throw new Error("Role Super Admin tidak dapat dihapus.");
  }
  await prisma.role.delete({ where: { name } });
  return { ok: true };
}
