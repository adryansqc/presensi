import { prisma } from "@/lib/prisma";

/**
 * Scope = batas wilayah data yang boleh diakses oleh user.
 *
 * Permission (lihat/tambah/ubah/hapus) sudah diatur Super Admin lewat menu
 * "Hak Akses". Scope answering pertanyaan berbeda: data mana yang boleh
 * tampil dan boleh diubah. Keduanya wajib ada.
 *
 * - kind "all"       : tanpa pembatasan wilayah (Super Admin, Admin CAI)
 * - kind "desa"      : hanya data di desa miliknya
 * - kind "kelompok"  : hanya data di kelompok miliknya
 * - kind "none"      : belum ditugaskan ke desa/kelompok mana pun (tidak bisa akses data)
 */
export type ScopeKind = "all" | "desa" | "kelompok" | "none";

export type Scope = {
  userId: string;
  role: string;
  desaId: string | null;
  kelompokId: string | null;
  kind: ScopeKind;
};

const UNLIMITED_ROLES = new Set(["Super_Admin", "Admin_CAI"]);

function resolveKind(
  role: string,
  desaId: string | null,
  kelompokId: string | null
): ScopeKind {
  if (UNLIMITED_ROLES.has(role)) return "all";
  if (role === "Desa") return desaId ? "desa" : "none";
  if (role === "Kelompok") return kelompokId ? "kelompok" : "none";
  // Role khusus (mis. "Pengurus Kelompok"): cakupan mengikuti wilayah yang
  // ditugaskan. Tanpa wilayah -> tidak ada akses, bukan seluruh wilayah.
  if (kelompokId) return "kelompok";
  if (desaId) return "desa";
  return "none";
}

/**
 * Scope selalu dibaca dari database (bukan dari JWT) supaya tetap akurat
 * ketika Super Admin memindahkan user ke desa/kelompok lain tanpa perlu
 * user login ulang.
 */
export async function getScope(userId: string | undefined): Promise<Scope | null> {
  if (!userId) return null;

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, desaId: true, kelompokId: true },
  });

  if (!row) return null;

  return {
    userId: row.id,
    role: row.role,
    desaId: row.desaId,
    kelompokId: row.kelompokId,
    kind: resolveKind(row.role, row.desaId, row.kelompokId),
  };
}

export function isUnlimited(scope: Scope) {
  return scope.kind === "all";
}

/** Filter untuk tabel Jamaah / Presensi. */
export function scopedWhere(scope: Scope): Record<string, unknown> {
  if (scope.kind === "all") return {};
  if (scope.kind === "none") return { id: "__tidak_ada_akses__" };
  if (scope.kind === "kelompok") return { kelompokId: scope.kelompokId };
  return { desaId: scope.desaId };
}

/**
 * Pastikan sebuah baris data (jamaah/presensi) berada di dalam wilayah user.
 * Dipakai sebelum update & delete supaya user tidak bisa menyentuh data
 * di luar kelompoknya meski ID-nya diketahui.
 */
export function assertWithinScope(
  scope: Scope,
  target: { desaId?: string | null; kelompokId?: string | null },
  label = "data"
) {
  if (scope.kind === "all") return;

  if (scope.kind === "none") {
    throw new Error(
      `Akun Anda belum ditugaskan ke desa atau kelompok mana pun sehingga tidak dapat mengelola ${label}.`
    );
  }

  if (scope.kind === "kelompok" && target.kelompokId !== scope.kelompokId) {
    throw new Error(`Anda hanya dapat mengelola ${label} milik kelompok Anda.`);
  }

  if (scope.kind === "desa" && target.desaId !== scope.desaId) {
    throw new Error(`Anda hanya dapat mengelola ${label} milik desa Anda.`);
  }
}

/** Sama seperti assertWithinScope, tetapi untuk	value yang akan disimpan. */
export function assertTargetWithinScope(
  scope: Scope,
  target: { desaId?: string | null; kelompokId?: string | null },
  label = "data"
) {
  assertWithinScope(scope, target, label);
}

export type ScopeMaps = {
  /** kelompokId -> desaId */
  kelompokToDesa: Map<string, string>;
};

/**
 * Apakah sebuah jadwal berada di dalam cakupan user?
 * Jadwal tingkat "Daerah" selalu terlihat karena cakupannya seluruh wilayah,
 * user tetap dibatasi saat mengisi absensi.
 */
export function jadwalVisible(
  scope: Scope,
  jadwal: { tingkat: string; desaIds: string[]; kelompokIds: string[] },
  maps: ScopeMaps
) {
  if (scope.kind === "all") return true;
  if (scope.kind === "none") return false;
  if (jadwal.tingkat === "Daerah") return true;

  if (scope.kind === "kelompok") {
    if (jadwal.kelompokIds.includes(scope.kelompokId!)) return true;
    const desaPemilik = scope.kelompokId ? maps.kelompokToDesa.get(scope.kelompokId) : null;
    return Boolean(desaPemilik && jadwal.desaIds.includes(desaPemilik));
  }

  // kind "desa"
  if (jadwal.desaIds.includes(scope.desaId!)) return true;
  return jadwal.kelompokIds.some((id) => maps.kelompokToDesa.get(id) === scope.desaId);
}

/** Data master (desa, kelompok, kategori, pengguna) hanya dikelola unrestricted. */
export function assertMasterDataWritable(scope: Scope, label: string) {
  if (scope.kind === "all") return;
  throw new Error(`Hanya Super Admin atau Admin CAI yang dapat menambah atau mengubah ${label}.`);
}

/** Peta kelompok -> desa untuk keperluan pengecekan cakupan jadwal. */
export async function getScopeMaps(): Promise<ScopeMaps> {
  const kelompokList = await prisma.kelompok.findMany({
    select: { id: true, desaId: true },
  });
  return {
    kelompokToDesa: new Map(kelompokList.map((k) => [k.id, k.desaId] as const)),
  };
}

export type JadwalCakupan = {
  tingkat?: string;
  desaIds?: string[] | null;
  kelompokIds?: string[] | null;
};

/**
 * Pastikan wilayah sebuah jadwal berada di dalam cakupan akun.
 *
 * - scope "all"      : bebas
 * - scope "desa"     : desa miliknya; kelompok yang dirujuk harus berada di desanya
 * - scope "kelompok" : hanya kelompok miliknya
 * - jadwal tanpa desa & kelompok (tingkat "Daerah") : hanya Super Admin/Admin CAI
 */
export function assertJadwalDalamScope(
  scope: Scope,
  jadwal: JadwalCakupan,
  maps: ScopeMaps,
  label = "jadwal"
) {
  if (scope.kind === "all") return;

  if (scope.kind === "none") {
    throw new Error(
      `Akun Anda belum ditugaskan ke desa atau kelompok mana pun sehingga tidak dapat mengelola ${label}.`
    );
  }

  const desaIds = jadwal.desaIds ?? [];
  const kelompokIds = jadwal.kelompokIds ?? [];

  if (desaIds.length === 0 && kelompokIds.length === 0) {
    throw new Error(
      `Jadwal tingkat Daerah mencakup seluruh wilayah sehingga hanya dapat dikelola Super Admin atau Admin CAI.`
    );
  }

  if (scope.kind === "kelompok") {
    const miliknya = kelompokIds.length > 0 && kelompokIds.every((id) => id === scope.kelompokId);
    const desaMilik = scope.kelompokId ? maps.kelompokToDesa.get(scope.kelompokId) : null;
    const desaValid =
      desaIds.length === 0 || (Boolean(desaMilik) && desaIds.every((id) => id === desaMilik));
    if (!miliknya || !desaValid) {
      throw new Error(`Anda hanya dapat mengelola ${label} milik kelompok Anda.`);
    }
    return;
  }

  // scope "desa"
  const desaValid = desaIds.length === 0 || desaIds.every((id) => id === scope.desaId);
  const kelompokValid =
    kelompokIds.length === 0 ||
    kelompokIds.every((id) => maps.kelompokToDesa.get(id) === scope.desaId);
  if (!desaValid || !kelompokValid) {
    throw new Error(`Anda hanya dapat mengelola ${label} milik desa Anda.`);
  }
}
