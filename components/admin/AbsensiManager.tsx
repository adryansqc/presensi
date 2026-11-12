"use client";

import { useCallback, useEffect, useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";

type PresensiRow = {
  jamaahId: string;
  namaJamaah: string;
  kategori: string;
  desa: string;
  kelompok: string;
  status: "Hadir" | "Izin" | "Sakit" | "";
  keterangan: string;
};

type JadwalItem = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  statusBuka: string;
};

const formatTanggal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

type PresensiItem = {
  id: string;
  jamaahId: string | null;
  namaJamaah: string;
  status: string;
  keterangan: string | null;
  jadwal: { jenisPengajian: string; tanggal: string };
  jamaah: { nama: string; desa: { nama: string }; kelompok: { nama: string } } | null;
};

export default function AbsensiManager() {
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [rows, setRows] = useState<PresensiRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>("");
  const swal = useSwal();

  const loadPresensi = useCallback(
    async (jadwalId: string) => {
      try {
        const res = await fetch(`/api/admin/presensi?jadwalId=${jadwalId}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as PresensiItem[];
        if (res.ok && Array.isArray(data)) {
          setRows(
            data.map((p) => ({
              jamaahId: p.jamaahId ?? "",
              namaJamaah: p.jamaah?.nama || p.namaJamaah,
              kategori: p.jamaah?.kelompok?.nama ?? "",
              desa: p.jamaah?.desa?.nama ?? "",
              kelompok: p.jamaah?.kelompok?.nama ?? "",
              status: (p.status as "Hadir" | "Izin" | "Sakit") || "",
              keterangan: p.keterangan ?? "",
            }))
          );
        }
      } catch {
        await swal.error("Gagal memuat presensi", "Tidak dapat menghubungi server.");
      }
    },
    [swal]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/jadwal", { cache: "no-store" });
        const data = (await res.json()) as JadwalItem[];
        if (!mounted) return;
        if (res.ok && Array.isArray(data)) {
          setJadwalList(data);
          const open = data.find((j) => j.statusBuka === "Buka");
          if (open) {
            setSelectedJadwalId(open.id);
            await loadPresensi(open.id);
          }
        }
      } catch {
        if (mounted) {
          await swal.error("Gagal memuat jadwal", "Tidak dapat menghubungi server.");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadPresensi, swal]);

  async function handleSelectJadwal(id: string) {
    const j = jadwalList.find((x) => x.id === id);
    if (j) {
      setSelectedJadwalId(id);
      setRows([]);
      await loadPresensi(id);
    }
  }

  function toggleStatus(jamaahId: string, status: "Hadir" | "Izin" | "Sakit") {
    setRows((prev) =>
      prev.map((r) => {
        if (r.jamaahId !== jamaahId) return r;
        if (r.status === status) {
          return { ...r, status: "", keterangan: "" };
        }
        return { ...r, status, keterangan: r.status === "" ? "" : r.keterangan };
      })
    );
  }

  function updateKeterangan(jamaahId: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.jamaahId === jamaahId ? { ...r, keterangan: value } : r))
    );
  }

  async function handleSave() {
    if (!selectedJadwalId) return;
    setSaving(true);
    try {
      for (const r of rows) {
        if (!r.status) continue;
        await fetch("/api/admin/presensi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jadwalId: selectedJadwalId,
            jamaahId: r.jamaahId || undefined,
            namaJamaah: r.namaJamaah,
            kategoriId: "",
            desaId: "",
            kelompokId: "",
            status: r.status,
            keterangan: r.keterangan || undefined,
          }),
        });
      }

      await swal.success("Berhasil disimpan", "Data absensi telah diperbarui.");
      setRows([]);
      await loadPresensi(selectedJadwalId);
    } catch {
      await swal.error("Gagal menyimpan", "Tidak dapat menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  const currentJadwal = jadwalList.find((j) => j.id === selectedJadwalId) ?? null;
  const hadirCount = rows.filter((r) => r.status === "Hadir").length;
  const izinCount = rows.filter((r) => r.status === "Izin").length;
  const sakitCount = rows.filter((r) => r.status === "Sakit").length;

  if (!currentJadwal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Belum ada sesi buka</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tidak ada jadwal yang sedang dibuka untuk absensi. Silakan hubungi pengurus untuk membuka sesi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Absensi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tandai kehadiran jamaah pada sesi yang sedang dibuka.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedJadwalId}
            onChange={(e) => handleSelectJadwal(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
          >
            {jadwalList.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jenisPengajian} - {formatTanggal(j.tanggal)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || hadirCount + izinCount + sakitCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Menyimpan..." : "Simpan Absensi"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Hadir: {hadirCount}</span>
        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">Izin: {izinCount}</span>
        <span className="px-2 py-1 rounded bg-red-50 text-red-700">Sakit: {sakitCount}</span>
        <span className="px-2 py-1 rounded bg-slate-100 text-slate-500">
          Belum: {rows.length - hadirCount - izinCount - sakitCount}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kelompok</th>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">Belum ada data jamaah</p>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.jamaahId || r.namaJamaah} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-700 font-medium">{r.namaJamaah}</td>
                  <td className="px-4 py-3 text-slate-700">{r.kelompok}</td>
                  <td className="px-4 py-3 text-slate-700">{r.desa}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleStatus(r.jamaahId, "Hadir")}
                        className={`rounded-full p-1.5 text-xs font-medium transition ${
                          r.status === "Hadir"
                            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        H
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(r.jamaahId, "Izin")}
                        className={`rounded-full p-1.5 text-xs font-medium transition ${
                          r.status === "Izin"
                            ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                        }`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(r.jamaahId, "Sakit")}
                        className={`rounded-full p-1.5 text-xs font-medium transition ${
                          r.status === "Sakit"
                            ? "bg-red-100 text-red-700 ring-2 ring-red-200"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-700"
                        }`}
                      >
                        S
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={r.keterangan}
                      onChange={(e) => updateKeterangan(r.jamaahId, e.target.value)}
                      placeholder="Keterangan..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
