"use client";

import { useMemo, useState } from "react";
import { PERMISSIONS, ROLES, type PermissionDef } from "@/lib/permissions";
import { useSwal } from "@/components/ui/SwalProvider";

type Assignments = Record<string, string[]>;

type RoleWithPermissions = {
  value: string;
  label: string;
  locked: boolean;
  permissions: string[];
};

type RolePermissionManagerProps = {
  initialAssignments: Assignments;
  roleDefinitions: RoleWithPermissions[];
  canManage?: boolean;
};

export default function RolePermissionManager({
  initialAssignments,
  roleDefinitions,
  canManage = false,
}: RolePermissionManagerProps) {
  const [assignments, setAssignments] = useState<Assignments>(initialAssignments);
  const [roleList, setRoleList] = useState<RoleWithPermissions[]>(roleDefinitions);
  const [activeRole, setActiveRole] = useState(roleDefinitions[0]?.value ?? ROLES[0].value);
  const [saving, setSaving] = useState(false);
  const swal = useSwal();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const activeDefinition = roleList.find((role) => role.value === activeRole) ?? roleList[0];
  const activePermissions = assignments[activeRole] ?? [];
  const locked = Boolean(activeDefinition.locked);
  const readOnly = locked || !canManage;

  const groups = useMemo(() => {
    const result: { group: string; items: PermissionDef[] }[] = [];
    for (const permission of PERMISSIONS) {
      const existing = result.find((item) => item.group === permission.group);
      if (existing) {
        existing.items.push(permission);
      } else {
        result.push({ group: permission.group, items: [permission] });
      }
    }
    return result;
  }, []);

  function updateRole(role: string, permissions: string[]) {
    setAssignments((current) => ({ ...current, [role]: permissions }));
  }

  function togglePermission(target: "active" | "create", key: string) {
    if (target === "active") {
      if (readOnly) return;
      const next = activePermissions.includes(key)
        ? activePermissions.filter((item) => item !== key)
        : [...activePermissions, key];
      updateRole(activeRole, next);
      return;
    }
    const next = createPermissions.includes(key)
      ? createPermissions.filter((item) => item !== key)
      : [...createPermissions, key];
    setCreatePermissions(next);
  }

  function toggleGroup(items: PermissionDef[], checked: boolean) {
    if (readOnly) return;
    const keys = items.map((item) => item.key);
    const next = checked
      ? Array.from(new Set([...activePermissions, ...keys]))
      : activePermissions.filter((item) => !keys.includes(item));
    updateRole(activeRole, next);
  }

  function toggleCreateGroup(items: PermissionDef[], checked: boolean) {
    const keys = items.map((item) => item.key);
    const next = checked
      ? Array.from(new Set([...createPermissions, ...keys]))
      : createPermissions.filter((item) => !keys.includes(item));
    setCreatePermissions(next);
  }

  async function handleSave() {
    if (readOnly) return;
    setSaving(true);

    try {
      const response = await fetch("/api/admin/role-permission", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeRole,
          permissions: activePermissions,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        await swal.error(
          "Gagal menyimpan",
          typeof data?.error === "string" ? data.error : "Gagal menyimpan hak akses."
        );
        return;
      }

      if (Array.isArray(data?.permissions)) {
        updateRole(activeRole, data.permissions);
      }
      await swal.success(
        "Berhasil disimpan",
        `Hak akses role ${activeDefinition.label} berhasil disimpan.`
      );
    } catch {
      await swal.error("Gagal menyimpan", "Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshRoles() {
    const response = await fetch("/api/admin/roles", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(data?.roles)) {
      setRoleList(data.roles);
      setAssignments(data.assignments ?? {});
      const stillExists = roleList.some((r) => r.value === activeRole);
      if (!stillExists) {
        setActiveRole(roleList[0]?.value ?? roleDefinitions[0]?.value ?? ROLES[0].value);
      }
    }
  }

  async function handleDeleteRole(name: string) {
    const ok = await swal.confirm({
      title: `Hapus role "${name}"?`,
      text: "Data izin role ini akan dihapus permanen dan tidak dapat dibatalkan.",
      tone: "warning",
      confirmText: "Ya, hapus",
      cancelText: "Batal",
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/admin/roles/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        await swal.error(
          "Gagal menghapus",
          typeof data?.error === "string" ? data.error : "Gagal menghapus role."
        );
        return;
      }
      await swal.success("Berhasil dihapus", `Role ${name} berhasil dihapus.`);
      await refreshRoles();
    } catch {
      await swal.error("Gagal menghapus", "Tidak dapat menghubungi server. Coba lagi.");
    }
  }

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCreateError("");
    if (!createName.trim()) {
      setCreateError("Nama role wajib diisi.");
      return;
    }
    setCreateSaving(true);
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), permissions: createPermissions }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateError(typeof data?.error === "string" ? data.error : "Gagal membuat role.");
        return;
      }
      setCreateOpen(false);
      setCreateName("");
      setCreatePermissions([]);
      setCreateError("");
      await swal.success("Berhasil dibuat", `Role ${createName} berhasil ditambahkan.`);
      await refreshRoles();
    } catch {
      setCreateError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setCreateSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Hak Akses Role</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Atur fitur apa saja yang dapat diakses oleh setiap role. Perubahan berlaku
            langsung setelah disimpan.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setCreateError("");
              setCreateName("");
              setCreatePermissions([]);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Izin menentukan tindakan, cakupan wilayah menentukan data.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
          <li>
            <span className="font-medium text-slate-700">Izin di bawah</span> mengatur apakah role boleh melihat,
            menambah, mengubah, atau menghapus data.
          </li>
          <li>
            <span className="font-medium text-slate-700">Cakupan wilayah</span> diatur per akun di menu{" "}
            <span className="font-medium text-slate-700">Pengguna</span>: role <span className="font-medium">Desa</span>{" "}
            ditugaskan ke satu desa, role <span className="font-medium">Kelompok</span> ditugaskan ke satu kelompok.
            Akun yang belum ditugaskan tidak dapat melihat data operasional apa pun.
          </li>
          <li>
            Contoh: role <span className="font-medium">Kelompok</span> dengan izin <span className="font-medium">Tambah Jamaah</span>{" "}
            hanya dapat menambah jamaah di kelompoknya sendiri.
          </li>
        </ul>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          {roleList.map((role) => {
            const isActive = role.value === activeRole;
            const count = assignments[role.value]?.length ?? 0;
            return (
              <div key={role.value} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRole(role.value);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{role.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      {count} izin
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {role.locked ? "Super Admin (tidak dapat diubah)" : "Role dinamis"}
                  </p>
                </button>
                {!role.locked && canManage && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteRole(role.value);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                    title="Hapus role"
                    aria-label={`Hapus ${role.label}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M4 7h16" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M6 7V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
                      <path d="M19 7v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{activeDefinition.label}</h2>
              <p className="text-xs text-slate-500">
                {locked
                  ? "Super Admin selalu memiliki seluruh izin dan tidak dapat diubah."
                  : !canManage
                  ? "Anda tidak memiliki izin mengubah hak akses role ini."
                  : `${activePermissions.length} dari ${PERMISSIONS.length} izin dipilih.`}
              </p>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || locked}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {saving ? "Menyimpan..." : "Simpan Hak Akses"}
                </button>
              )}
              {!locked && canManage && (
                <button
                  type="button"
                  onClick={() => handleDeleteRole(activeDefinition.value)}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  Hapus Role
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-5">
            {groups.map((group) => {
              const keys = group.items.map((item) => item.key);
              const allChecked = keys.every((key) => activePermissions.includes(key));
              return (
                <div key={group.group}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.group}
                    </h3>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.items, !allChecked)}
                        disabled={locked}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                      >
                        {allChecked ? "Kosongkan" : "Pilih semua"}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((permission) => {
                      const checked =
                        locked || activePermissions.includes(permission.key);
                      return (
                        <label
                          key={permission.key}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                            checked
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          } ${readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => togglePermission("active", permission.key)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-700">
                              {permission.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {permission.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setCreateOpen(false)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Role</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Beri nama role baru dan pilih izin awalnya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {createError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                    {createError}
                  </div>
                )}

                <div>
                  <label htmlFor="create-role-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nama Role <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <input
                    id="create-role-name"
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Contoh: Manajer Lapangan"
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Izin Awal
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groups.map((group) => (
                      <div key={group.group}>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {group.group}
                          </h4>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => toggleCreateGroup(group.items, group.items.every((item) => createPermissions.includes(item.key)) ? false : true)}
                              className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              {group.items.every((item) => createPermissions.includes(item.key)) ? "Kosongkan" : "Pilih semua"}
                            </button>
                          )}
                        </div>
                        {group.items.map((permission) => {
                          const checked = createPermissions.includes(permission.key);
                          return (
                            <label
                              key={permission.key}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                                checked
                                  ? "border-emerald-200 bg-emerald-50/50"
                                  : "border-slate-200 hover:border-slate-300"
                              } ${readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={readOnly}
                                onChange={() => togglePermission("create", permission.key)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-slate-700">{permission.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={createSaving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {createSaving ? "Menyimpan..." : "Simpan Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
