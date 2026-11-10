"use client";

import { useState } from "react";
import { parseCSV } from "@/lib/csv";
import { useSwal } from "@/components/ui/SwalProvider";

type JamaahRow = {
  nama: string;
  desa: string;
  kelompok: string;
  kategori: string;
  noWa: string;
};

export default function JamaahImport() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<JamaahRow[]>([]);
  const [preview, setPreview] = useState<JamaahRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const swal = useSwal();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setImportError("File harus berformat .csv.");
      setFile(null);
      setRows([]);
      setPreview([]);
      return;
    }
    setFile(selected);
    setImportError("");

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setImportError("CSV kosong atau hanya berisi header.");
        setRows([]);
        setPreview([]);
        return;
      }
      const header = parsed[0].map((h) => h.toLowerCase().trim());
      const idx = (name: string) => header.indexOf(name);
      const mapped: JamaahRow[] = parsed.slice(1).map((row) => ({
        nama: row[idx("nama")] ?? "",
        desa: row[idx("desa")] ?? "",
        kelompok: row[idx("kelompok")] ?? "",
        kategori: row[idx("kategori")] ?? "",
        noWa: row[idx("nowa")] ?? "",
      }));
      setRows(mapped);
      setPreview(mapped.slice(0, 10));
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/jamaah/import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        await swal.error(
          "Gagal mengimpor",
          typeof data?.error === "string" ? data.error : "Gagal mengimpor data."
        );
        return;
      }

      await swal.success(
        "Berhasil diimpor",
        `Berhasil menambahkan ${data.success ?? 0} data jamaah.${
          data.errors?.length ? ` ${data.errors.length} data gagal.` : ""
        }`
      );

      setFile(null);
      setRows([]);
      setPreview([]);
      setImportError("");
    } catch {
      await swal.error(
        "Gagal mengimpor",
        "Tidak dapat menghubungi server. Coba lagi."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Impor Data Jamaah (CSV)</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Unggah file CSV dengan kolom{" "}
          <span className="font-medium text-slate-700">nama, desa, kelompok, kategori, noWa</span>.
          Data yang gagal (misal kelompok/kategori tidak dikenal) akan dilaporkan.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Pilih file CSV</span>
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileChange}
            />
            {file && (
              <span className="ml-2 text-xs text-emerald-600 font-medium">
                {file.name}
              </span>
            )}
          </label>

          {importError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {importError}
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {rows.length} data ditemukan. Menampilkan {preview.length} teratas:
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                        Nama
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                        Desa
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                        Kelompok
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                        Kategori
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                        No WA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[120px]">
                          {row.nama}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[100px]">
                          {row.desa}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[100px]">
                          {row.kelompok}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[100px]">
                          {row.kategori}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[120px]">
                          {row.noWa || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > preview.length && (
                <p className="text-xs text-slate-400 text-center">
                  dan {rows.length - preview.length} data lainnya...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setRows([]);
            setPreview([]);
            setImportError("");
          }}
          disabled={!file || importing}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!file || rows.length === 0 || importing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {importing && (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {importing ? "Mengimpor..." : "Impor Semua Data"}
        </button>
      </div>
    </div>
  );
}
