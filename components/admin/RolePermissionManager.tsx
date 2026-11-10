"use client";

import { useMemo, useState } from "react";
import { PERMISSIONS, ROLES, type PermissionDef } from "@/lib/permissions";
import { useSwal } from "@/components/ui/SwalProvider";

type Assignments = Record<string, string[]>;

export default function RolePermissionManager({
  initialAssignments,
  canManage = false,
}: {
  initialAssignments: Assignments;
  canManage?: boolean;
}) {
  const [assignments, setAssignments] = useState<Assignments>(initialAssignments);
  const [activeRole, setActiveRole] = useState(ROLES[0].value);
  const [saving, setSaving] = useState(false);
  const swal = useSwal();

  const activeDefinition = ROLES.find((role) => role.value === activeRole) ?? ROLES[0];
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

  function togglePermission(key: string) {
    if (readOnly) return;
    const next = activePermissions.includes(key)
      ? activePermissions.filter((item) => item !== key)
      : [...activePermissions, key];
    updateRole(activeRole, next);
  }

  function toggleGroup(items: PermissionDef[], checked: boolean) {
    if (readOnly) return;
    const keys = items.map((item) => item.key);
    const next = checked
      ? Array.from(new Set([...activePermissions, ...keys]))
      : activePermissions.filter((item) => !keys.includes(item));
    updateRole(activeRole, next);
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Hak Akses Role</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Atur fitur apa saja yang dapat diakses oleh setiap role. Perubahan berlaku
          langsung setelah disimpan.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-2">
          {ROLES.map((role) => {
            const isActive = role.value === activeRole;
            const count = assignments[role.value]?.length ?? 0;
            return (
              <button
                key={role.value}
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
                  <span className="text-sm font-semibold text-slate-800">
                    {role.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {count} izin
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{role.description}</p>
              </button>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {activeDefinition.label}
              </h2>
              <p className="text-xs text-slate-500">
                {locked
                  ? "Super Admin selalu memiliki seluruh izin dan tidak dapat diubah."
                  : !canManage
                  ? "Anda tidak memiliki izin mengubah hak akses role ini."
                  : `${activePermissions.length} dari ${PERMISSIONS.length} izin dipilih.`}
              </p>
            </div>
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
                            onChange={() => togglePermission(permission.key)}
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
    </div>
  );
}
