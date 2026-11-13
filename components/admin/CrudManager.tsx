"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, FieldDef } from "@/lib/admin/resources";
import { useSwal } from "@/components/ui/SwalProvider";

type Row = Record<string, unknown>;

type CrudManagerProps = {
  resource: string;
  endpoint: string;
  title: string;
  singular: string;
  description: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchKeys: string[];
  initialRows: Row[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  importUrl?: string;
  importLabel?: string;
  /**
   * Tautan tambahan per baris, mis. untuk membuka daftar milik baris tersebut.
   * `titleTemplate` boleh memuat placeholder `{nama}` yang diganti dengan nama baris.
   */
  rowLink?: { base: string; label: string; titleTemplate?: string };
};

function prettify(value: string) {
  return value.replace(/_/g, " ");
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase();
  if (["aktif", "buka", "hadir", "super admin", "admin cai", "daerah"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (["izin", "desa"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (["sakit", "pindah"].includes(normalized)) {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }
  if (["tidak aktif", "tutup", "kelompok"].includes(normalized)) {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function formatDate(value: unknown, withTime = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function emptyForm(fields: FieldDef[], row?: Row) {
  const form: Row = {};
  for (const field of fields) {
    if (row) {
      if (field.type === "password") {
        form[field.name] = "";
      } else if (field.type === "checkbox") {
        form[field.name] = Boolean(row[field.name]);
      } else {
        form[field.name] = row[field.name] ?? "";
      }
    } else if (field.type === "checkbox") {
      form[field.name] = field.defaultValue ?? true;
    } else {
      form[field.name] = field.defaultValue ?? (field.multiSelect ? [] : "");
    }
  }
  return form;
}

function renderCell(row: Row, column: ColumnDef) {
  const value = row[column.key];

  if (column.type === "badge") {
    const label =
      typeof value === "boolean" ? (value ? "Aktif" : "Nonaktif") : prettify(String(value ?? "—"));
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTone(
          label
        )}`}
      >
        {label}
      </span>
    );
  }

  if (column.type === "date") return formatDate(value);
  if (column.type === "datetime") return formatDate(value, true);
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function CrudManager({
  resource,
  endpoint,
  title,
  singular,
  description,
  columns,
  fields,
  searchKeys,
  initialRows,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  importUrl,
  importLabel = "Impor CSV",
  rowLink,
}: CrudManagerProps) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const swal = useSwal();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle))
    );
  }, [rows, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  async function refreshRows() {
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok && Array.isArray(data)) {
      setRows(data);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(fields));
    setError("");
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setForm(emptyForm(fields, row));
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    setError("");
  }

  function updateField(name: string, value: unknown) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(editing);
      const response = await fetch(isEditing ? `${endpoint}/${editing?.id}` : endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : "Gagal menyimpan data.");
        return;
      }

      await refreshRows();
      setOpen(false);
      setEditing(null);
      await swal.success(
        isEditing ? "Berhasil diperbarui" : "Berhasil ditambahkan",
        isEditing
          ? `${singular} berhasil diperbarui.`
          : `${singular} baru berhasil ditambahkan.`
      );
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    const id = String(row.id);
    const ok = await swal.confirm({
      title: `Hapus ${singular.toLowerCase()} ini?`,
      text: "Tindakan ini tidak dapat dibatalkan.",
      tone: "warning",
      confirmText: "Ya, hapus",
      cancelText: "Batal",
    });
    if (!ok) return;

    setDeleting(id);
    try {
      const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        await swal.error(
          "Gagal menghapus",
          typeof data?.error === "string" ? data.error : "Gagal menghapus data."
        );
        return;
      }
      await refreshRows();
      await swal.success("Berhasil dihapus", `${singular} berhasil dihapus.`);
    } catch {
      await swal.error("Gagal menghapus", "Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setDeleting(null);
    }
  }

  const renderRowActions = (row: Row) => (
    <>
      {rowLink && (
        <a
          href={`${rowLink.base}/${row.id}`}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          title={(rowLink.titleTemplate ?? rowLink.label).replace(
            "{nama}",
            String(row.nama ?? "")
          )}
          aria-label={rowLink.label}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M14.5 20a4.5 4.5 0 0 1 7 0" />
          </svg>
        </a>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          title="Ubah"
          aria-label={`Ubah ${singular}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => handleDelete(row)}
          disabled={deleting === String(row.id)}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          title="Hapus"
          aria-label={`Hapus ${singular}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="M6 7V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
            <path d="M19 7v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex w-full flex-col sm:flex-row sm:items-end sm:justify-end gap-3">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/25"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Tambah
            </button>
          )}
          {importUrl && (
            <a
              href={importUrl}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-200/30"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polyline points="14 2 2 12 14 22" />
                <path d="M2 12h20" />
              </svg>
              {importLabel}
            </a>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Cari data..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <p className="text-xs text-slate-500">
            {filteredRows.length} dari {rows.length} data
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">Belum ada data</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {query ? "Tidak ada data yang cocok dengan pencarian." : `Tambahkan ${singular.toLowerCase()} pertama Anda.`}
                    </p>
                  </td>
                </tr>
              )}
              {paginatedRows.map((row) => (
                <tr key={String(row.id)} className="transition hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">
                      {renderCell(row, column)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {renderRowActions(row)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRows.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            {(page - 1) * pageSize + 1} hingga{" "}
            {Math.min(page * pageSize, filteredRows.length)} dari {filteredRows.length} data
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-slate-100"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-slate-100"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editing ? `Ubah ${singular}` : `Tambah ${singular}`}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lengkapi data di bawah, lalu simpan perubahan.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => {
                    const id = `${resource}-${field.name}`;
                    const isCheckbox = field.type === "checkbox";
                    const required =
                      field.required && !(editing && field.type === "password");
                    const value = form[field.name];
                    const isWide = field.type === "textarea" || isCheckbox;

                    if (field.visibleWhen) {
                      const current = String(form[field.visibleWhen.field] ?? "");
                      if (
                        field.visibleWhen.equals !== undefined &&
                        current !== field.visibleWhen.equals
                      ) {
                        return null;
                      }
                      if (
                        field.visibleWhen.notEquals &&
                        field.visibleWhen.notEquals.includes(current)
                      ) {
                        return null;
                      }
                    }

                    if (isCheckbox) {
                      return (
                        <div key={field.name} className="sm:col-span-2">
                          <label
                            htmlFor={id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(event) => updateField(field.name, event.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>
                              <span className="block text-sm font-medium text-slate-700">
                                {field.label}
                              </span>
                              {field.help && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {field.help}
                                </span>
                              )}
                            </span>
                          </label>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={field.name}
                        className={isWide ? "sm:col-span-2" : undefined}
                      >
                        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
                          {field.label}
                          {required && <span className="ml-0.5 text-red-500">*</span>}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            id={id}
                            value={String(value ?? "")}
                            onChange={(event) => updateField(field.name, event.target.value)}
                            placeholder={field.placeholder}
                            required={required}
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          />
                        ) : field.type === "select" ? (
                          field.multiSelect ? (
                            <select
                              id={id}
                              multiple
                              value={Array.isArray(value) ? value : []}
                              onChange={(event) => {
                                const selected = Array.from(event.target.selectedOptions).map(
                                  (o) => o.value
                                );
                                updateField(field.name, selected);
                              }}
                              required={required}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            >
                              <option value="">{field.placeholder ?? "-- Pilih --"}</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              id={id}
                              value={String(value ?? "")}
                              onChange={(event) => updateField(field.name, event.target.value)}
                              required={required}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            >
                              <option value="">{field.placeholder ?? "-- Pilih --"}</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )
                        ) : (
                          <input
                            id={id}
                            type={field.type}
                            value={String(value ?? "")}
                            onChange={(event) => updateField(field.name, event.target.value)}
                            placeholder={field.placeholder}
                            required={required}
                            min={field.type === "number" ? 0 : undefined}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          />
                        )}

                        {field.help && !isCheckbox && (
                          <p className="mt-1 text-xs text-slate-500">{field.help}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving && (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
