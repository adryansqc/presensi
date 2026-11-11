"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSwal } from "@/components/ui/SwalProvider";

type JadwalInfo = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  desaIds: string[];
  kelompokIds: string[];
  kategoriIds: string[];
  statusBuka: string;
  lokasi: string;
};

export type JamaahRow = {
  id: string;
  nama: string;
  kategoriNama: string;
  desaNama: string;
  kelompokNama: string;
  desaId: string;
  kelompokId: string;
  noWa: string | null;
};

type PresensiEntry = {
  jamaahId: string | null;
  status: string | null;
  keterangan: string | null;
};

type GroupedJamaah = {
  desa: string;
  kelompok: string;
  items: JamaahRow[];
};

type StatusValue = "Hadir" | "Izin" | "Sakit";

const STATUS_CONFIG: Record<StatusValue, { label: string; color: string; bg: string; ring: string; border: string }> = {
  Hadir: { label: "H", color: "text-emerald-700", bg: "bg-emerald-100", ring: "ring-emerald-200", border: "border-emerald-200" },
  Izin: { label: "I", color: "text-amber-700", bg: "bg-amber-100", ring: "ring-amber-200", border: "border-amber-200" },
  Sakit: { label: "S", color: "text-red-700", bg: "bg-red-100", ring: "ring-red-200", border: "border-red-200" },
};

export default function PresensiDetailManager({
  jadwal,
  jamaah,
  presensiMap,
}: {
  jadwal: JadwalInfo;
  jamaah: JamaahRow[];
  presensiMap: Record<string, PresensiEntry>;
}) {
  const swal = useSwal();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, StatusValue>>({});
  const [keteranganMap, setKeteranganMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, StatusValue> = {};
    const nextKet: Record<string, string> = {};
    for (const j of jamaah) {
      const existing = presensiMap[j.id];
      if (existing?.status === "Hadir" || existing?.status === "Izin" || existing?.status === "Sakit") {
        next[j.id] = existing.status as StatusValue;
      }
      if (existing?.keterangan) {
        nextKet[j.id] = existing.keterangan;
      }
    }
    setStatusMap(next);
    setKeteranganMap(nextKet);
  }, [jamaah, presensiMap]);

  const filteredJamaah = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return jamaah;
    return jamaah.filter((j) =>
      j.nama.toLowerCase().includes(needle) ||
      j.kelompokNama.toLowerCase().includes(needle) ||
      j.desaNama.toLowerCase().includes(needle) ||
      j.kategoriNama.toLowerCase().includes(needle)
    );
  }, [jamaah, searchQuery]);

  const grouped = useMemo<GroupedJamaah[]>(() => {
    const desaMap = new Map<string, Map<string, JamaahRow[]>>();
    for (const j of filteredJamaah) {
      let byKelompok = desaMap.get(j.desaNama);
      if (!byKelompok) {
        byKelompok = new Map();
        desaMap.set(j.desaNama, byKelompok);
      }
      let items = byKelompok.get(j.kelompokNama);
      if (!items) {
        items = [];
        byKelompok.set(j.kelompokNama, items);
      }
      items.push(j);
    }

    const result: GroupedJamaah[] = [];
    for (const [desa, byKelompok] of desaMap) {
      for (const [kelompok, items] of byKelompok) {
        result.push({ desa, kelompok, items });
      }
    }
    return result;
  }, [filteredJamaah]);

  const toggleStatus = (id: string, status: StatusValue) => {
    setStatusMap((prev) => {
      if (prev[id] === status) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: status };
    });
  };

  const updateKeterangan = (id: string, value: string) => {
    setKeteranganMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = useCallback(async () => {
    const entries = Object.entries(statusMap);
    if (entries.length === 0) {
      await swal.error("Belum ada yang dipilih", "Silakan tandai minimal satu jamaah.");
      return;
    }
    setSaving(true);
    try {
      const errors: string[] = [];
      for (const [id, status] of entries) {
        const j = jamaah.find((x) => x.id === id);
        if (!j) continue;
        try {
          const res = await fetch("/api/admin/presensi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jadwalId: jadwal.id,
              jamaahId: j.id,
              namaJamaah: j.nama,
              kategoriId: "",
              desaId: j.desaId || "",
              kelompokId: j.kelompokId || "",
              status,
              keterangan: keteranganMap[id] || undefined,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors.push(`${j.nama}: ${err.error || "Gagal simpan"}`);
          }
        } catch {
          errors.push(`${j.nama}: Gagal terhubung ke server.`);
        }
      }

      if (errors.length > 0) {
        await swal.error("Beberapa gagal tersimpan", errors.join("\n"));
      } else {
        await swal.success("Berhasil disimpan", "Data presensi jamaah telah diperbarui.");
      }
    } catch {
      await swal.error("Gagal menyimpan", "Tidak dapat menghubungi server.");
    } finally {
      setSaving(false);
    }
  }, [statusMap, jamaah, jadwal, keteranganMap, swal]);

  const totalMarked = Object.keys(statusMap).length;
  const totalCount = filteredJamaah.length;

  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleBagikan = useCallback(async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/admin/jadwal/${jadwal.id}/bagikan`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.link) {
        setPublicLink(data.link);
        await swal.success("Link dibagikan", "Link presensi publik telah dibuat.");
      } else {
        await swal.error("Gagal membagikan link", data.error || "Tidak dapat membuat link publik.");
      }
    } catch {
      await swal.error("Gagal membagikan link", "Tidak dapat menghubungi server.");
    } finally {
      setSharing(false);
    }
  }, [jadwal.id, swal]);

  const copyLink = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink);
    swal.success("Disalin", "Link telah disalin ke clipboard.");
  };

  const getStatus = (id: string) => statusMap[id];

  const statuses: StatusValue[] = ["Hadir", "Izin", "Sakit"];

  const renderStatusButtons = (id: string, current: StatusValue | undefined) => (
    <div className="flex items-center justify-center gap-1">
      {statuses.map((s) => {
        const cfg = STATUS_CONFIG[s];
        const active = current === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(id, s)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition ${
              active
                ? `${cfg.color} ${cfg.bg} ${cfg.border} shadow-sm`
                : "text-slate-400 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
            }`}
            aria-pressed={active}
            aria-label={`${s} untuk ${id}`}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/admin/presensi"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Kembali ke Daftar Jadwal
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Detail Jadwal &amp; Presensi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tandai status kehadiran jamaah dengan memilih Hadir / Izin / Sakit.
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-end gap-2 sm:items-center">
          {jadwal.statusBuka === "Buka" && (
            <button
              type="button"
              disabled={sharing}
              onClick={handleBagikan}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sharing ? "Membuat..." : "Bagikan Link Publik"}
            </button>
          )}
          <button
            type="button"
            disabled={saving || totalMarked === 0}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Menyimpan..." : "Simpan Presensi"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jenis Pengajian</p>
            <p className="text-slate-900 font-medium">{jadwal.jenisPengajian}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</p>
            <p className="text-slate-900 font-medium">{jadwal.tanggal}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Waktu</p>
            <p className="text-slate-900 font-medium">{jadwal.jamMulai} - {jadwal.jamSelesai}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tingkat / Lokasi</p>
            <p className="text-slate-900 font-medium">{jadwal.tingkat} — {jadwal.lokasi}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status Sesi</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              jadwal.statusBuka === "Buka"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}>
              {jadwal.statusBuka === "Buka" ? "● Buka" : "○ Tutup"}
            </span>
          </div>
        </div>
      </div>

      {publicLink && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-blue-600">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">Link Presensi Publik</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={publicLink}
                readOnly
                className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50"
              >
                Salin
              </button>
            </div>
            <p className="text-[10px] text-blue-500 mt-1">
              Bagikan link ini kepada jamaah untuk absensi Izin atau Sakit secara publik.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <input
            type="text"
            placeholder="Cari nama jamaah, kelompok, desa, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
          />
          <span className="text-xs text-slate-500">
            {totalCount} jamaah
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-10">No.</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nama Jamaah</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">Tidak ada jamaah yang cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                grouped.map(({ desa, kelompok, items }, gIdx) => (
                  <React.Fragment key={`${desa}|${kelompok}`}>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm text-slate-900">{desa}</div>
                          <span className="text-xs text-emerald-600 font-medium">{kelompok}</span>
                        </div>
                      </td>
                    </tr>
                    {items.map((j) => {
                      const current = getStatus(j.id);
                      return (
                        <tr key={j.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-sm text-slate-500">{gIdx + 1}.{items.indexOf(j) + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{j.nama}</td>
                          <td className="px-4 py-3 text-center">
                            {renderStatusButtons(j.id, current)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={keteranganMap[j.id] ?? ""}
                              onChange={(e) => updateKeterangan(j.id, e.target.value)}
                              disabled={!current}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
              Ditandai: {totalMarked}
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-500">
              Total: {totalCount}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Keterangan hanya dapat diisi saat jamaah telah ditandai.
          </p>
        </div>
      </div>
    </div>
  );
}
