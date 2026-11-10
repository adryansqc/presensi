export type PermissionDef = {
  key: string;
  label: string;
  group: string;
  description: string;
};

export type RoleDef = {
  value: string;
  label: string;
  description: string;
  locked?: boolean;
};

export const PERMISSION_ACTIONS = [
  { key: "view", label: "Lihat" },
  { key: "create", label: "Tambah" },
  { key: "edit", label: "Ubah" },
  { key: "delete", label: "Hapus" },
] as const;

export const PERMISSION_RESOURCES = [
  { key: "desa", label: "Desa", group: "Data Master" },
  { key: "kelompok", label: "Kelompok", group: "Data Master" },
  { key: "kategori", label: "Kategori", group: "Data Master" },
  { key: "jamaah", label: "Jamaah", group: "Operasional" },
  { key: "jadwal", label: "Jadwal", group: "Operasional" },
  { key: "presensi", label: "Presensi", group: "Operasional" },
  { key: "pengguna", label: "Pengguna", group: "Sistem" },
] as const;

export const PERMISSIONS: PermissionDef[] = [
  {
    key: "dashboard.view",
    label: "Lihat dashboard",
    group: "Dashboard",
    description: "Membuka ringkasan data pada panel administrasi.",
  },
  ...PERMISSION_RESOURCES.flatMap((resource) =>
    PERMISSION_ACTIONS.map((action) => ({
      key: `${resource.key}.${action.key}`,
      label: `${action.label} ${resource.label}`,
      group: resource.group,
      description: `Izin untuk ${action.label.toLowerCase()} data ${resource.label.toLowerCase()}.`,
    }))
  ),
  {
    key: "role.manage",
    label: "Kelola hak akses",
    group: "Sistem",
    description: "Mengatur permission untuk setiap role pengguna.",
  },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

const VIEW_ONLY_KEYS = [
  "dashboard.view",
  ...PERMISSION_RESOURCES.filter((resource) => resource.key !== "pengguna").map(
    (resource) => `${resource.key}.view`
  ),
];

export const ROLES: RoleDef[] = [
  {
    value: "Super_Admin",
    label: "Super Admin",
    description: "Akses penuh ke seluruh fitur. Hak akses tidak dapat diubah.",
    locked: true,
  },
  {
    value: "Admin_CAI",
    label: "Admin CAI",
    description: "Mengelola data operasional dan pengguna, tanpa pengaturan hak akses.",
  },
  {
    value: "Desa",
    label: "Desa",
    description: "Akses terbatas untuk melihat data pada tingkat desa.",
  },
  {
    value: "Kelompok",
    label: "Kelompok",
    description: "Akses terbatas untuk melihat data pada tingkat kelompok.",
  },
];

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((role) => [role.value, role.label])
);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Super_Admin: [...ALL_PERMISSION_KEYS],
  Admin_CAI: ALL_PERMISSION_KEYS.filter((key) => key !== "role.manage"),
  Desa: [...VIEW_ONLY_KEYS],
  Kelompok: [...VIEW_ONLY_KEYS],
};

export function isKnownPermission(value: string) {
  return ALL_PERMISSION_KEYS.includes(value);
}

export function resourcePermission(resource: string, action: string) {
  return `${resource}.${action}`;
}
