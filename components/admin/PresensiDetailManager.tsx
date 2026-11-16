"use client";

import React, { useCallback, useMemo, useState } from "react";
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

function isStatusValue(value: string | null | undefined): value is StatusValue {
  return value === "Hadir" || value === "Izin" || value === "Sakit";
}

/** Status kehadiran yang sudah tersimpan di server, untuk seed state awal. */
function statusTersimpan(
  jamaah: JamaahRow[],
  presensiMap: Record<string, PresensiEntry>
): Record<string, StatusValue> {
  const status: Record<string, StatusValue> = {};
  for (const j of jamaah) {
    const existing = presensiMap[j.id];
    if (isStatusValue(existing?.status)) {
      status[j.id] = existing.status;
    }
  }
  return status;
}

/** Keterangan yang sudah tersimpan di server, untuk seed state awal. */
function keteranganTersimpan(
  jamaah: JamaahRow[],
  presensiMap: Record<string, PresensiEntry>
): Record<string, string> {
  const keterangan: Record<string, string> = {};
  for (const j of jamaah) {
    const existing = presensiMap[j.id];
    if (existing?.keterangan) {
      keterangan[j.id] = existing.keterangan;
    }
  }
  return keterangan;
}

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
  const [statusMap, setStatusMap] = useState<Record<string, StatusValue>>(() =>
    statusTersimpan(jamaah, presensiMap)
  );
  const [keteranganMap, setKeteranganMap] = useState<Record<string, string>>(() =>
    keteranganTersimpan(jamaah, presensiMap)
  );
  const [saving, setSaving] = useState(false);

  // Reset state saat data dari server berubah. Disesuaikan saat render (bukan
  // di dalam effect) agar tidak memicu cascading render — pola resmi React
  // "adjusting state when a prop changes". Identitas prop `jamaah` dan
  // `presensiMap` dipakai sebagai penanda karena keduanya objek baru setiap
  // kali server mengirim ulang data.
  const [terakhir, setTerakhir] = useState<{
    daftar: JamaahRow[];
    data: Record<string, PresensiEntry>;
  }>({ daftar: jamaah, data: presensiMap });

  if (terakhir.daftar !== jamaah || terakhir.data !== presensiMap) {
    setTerakhir({ daftar: jamaah, data: presensiMap });
    setStatusMap(statusTersimpan(jamaah, presensiMap));
    setKeteranganMap(keteranganTersimpan(jamaah, presensiMap));
  }

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

  const hitung = useMemo(() => {
    const hadir = Object.values(statusMap).filter((s) => s === "Hadir").length;
    const izin = Object.values(statusMap).filter((s) => s === "Izin").length;
    const sakit = Object.values(statusMap).filter((s) => s === "Sakit").length;
    const belum = totalCount - hadir - izin - sakit;
    return { hadir, izin, sakit, belum };
  }, [statusMap, totalCount]);

  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const cetakHTML = () => {
    const rows = grouped.map(({ desa, kelompok, items }) => {
      const rowsHtml = items
        .map((j, idx) => {
          const s = getStatus(j.id);
          const cfg = s ? STATUS_CONFIG[s] : null;
          return `
            <tr>
              <td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:12px;text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:12px;">${j.nama}</td>
              <td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:12px;text-align:center;">${cfg ? cfg.label : "-"}</td>
              <td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:12px;">${keteranganMap[j.id] ?? ""}</td>
            </tr>
          `;
        })
        .join("");
      return `
        <tr>
          <td colspan="4" style="border:1px solid #cbd5e1;padding:8px 12px;font-size:13px;font-weight:600;color:#047857;background:#f0fdf4;">${desa} — ${kelompok}</td>
        </tr>
        ${rowsHtml}
      `;
    }).join("");

    const statsHtml = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr>
          <td style="border:1px solid #cbd5e1;padding:10px;text-align:center;background:#f0fdf4;color:#047857;font-weight:700;"><div style="font-size:11px;opacity:0.8;">Hadir</div><div style="font-size:16px;">${hitung.hadir}</div></td>
          <td style="border:1px solid #cbd5e1;padding:10px;text-align:center;background:#fffbeb;color:#92400e;font-weight:700;"><div style="font-size:11px;opacity:0.8;">Izin</div><div style="font-size:16px;">${hitung.izin}</div></td>
          <td style="border:1px solid #cbd5e1;padding:10px;text-align:center;background:#fef2f2;color:#991b1b;font-weight:700;"><div style="font-size:11px;opacity:0.8;">Sakit</div><div style="font-size:16px;">${hitung.sakit}</div></td>
          <td style="border:1px solid #cbd5e1;padding:10px;text-align:center;background:#f1f5f9;color:#475569;font-weight:700;"><div style="font-size:11px;opacity:0.8;">Belum</div><div style="font-size:16px;">${hitung.belum}</div></td>
          <td style="border:1px solid #cbd5e1;padding:10px;text-align:center;background:#eef2ff;color:#4338ca;font-weight:700;"><div style="font-size:11px;opacity:0.8;">Total</div><div style="font-size:16px;">${totalCount}</div></td>
        </tr>
      </table>
    `;

    return `
      <html>
        <head>
          <title>Laporan Presensi - ${jadwal.jenisPengajian}</title>
          <style>
            @page { size: A4; margin: 14mm 12mm; }
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #334155; line-height: 1.4; margin: 0; }
            .header { border-bottom: 3px solid #047857; padding-bottom: 12px; margin-bottom: 16px; }
            .header h1 { font-size: 20px; margin: 0 0 4px 0; color: #0f172a; font-weight: 700; }
            .header .sub { font-size: 11px; color: #64748b; margin: 2px 0; }
            .meta { display: flex; gap: 12px; font-size: 10px; color: #64748b; margin-bottom: 14px; flex-wrap: wrap; }
            .meta span { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table.data { width: 100%; border-collapse: collapse; }
            table.data th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; text-align: left; }
            table.data td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 11px; vertical-align: top; }
            table.data tr:nth-child(even) td { background: #f8fafc; }
            .group-row td { background: #f0fdf4 !important; color: #047857; font-weight: 700; font-size: 11.5px; }
            .footer { margin-top: 18px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            .noprint { display: none !important; }
            @media print {
              .noprint { display: none !important; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Presensi</h1>
            <div class="sub">${jadwal.jenisPengajian}</div>
          </div>
          <div class="meta">
            <span>${jadwal.tanggal} • ${jadwal.jamMulai} - ${jadwal.jamSelesai}</span>
            <span>Tingkat: ${jadwal.tingkat}</span>
            <span>Lokasi: ${jadwal.lokasi}</span>
            <span>Status Sesi: ${jadwal.statusBuka}</span>
          </div>
          ${statsHtml}
          <table class="data">
            <thead>
              <tr>
                <th style="width:40px;">No.</th>
                <th>Nama Jamaah</th>
                <th style="width:90px;text-align:center;">Status</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">Dicetak dari Sistem Presensi Jambi Kota 1 — ${new Date().toLocaleDateString("id-ID")}</div>
          <script>window.print();</script>
        </body>
      </html>
    `;
  };

  const handleCetakPDF = () => {
    const html = cetakHTML();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const handleDownloadExcel = () => {
    import("xlsx").then((XLSX) => {
      const rows: Record<string, unknown>[] = [];
      let no = 1;
      for (const { desa, kelompok, items } of grouped) {
        for (const j of items) {
          const s = getStatus(j.id);
          const statusLabel = s ? STATUS_CONFIG[s].label : "-";
          rows.push({
            "No.": no++,
            Desa: desa,
            Kelompok: kelompok,
            "Nama Jamaah": j.nama,
            Status: statusLabel,
            Keterangan: keteranganMap[j.id] ?? "",
          });
        }
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Presensi");

      const namaFile = `presensi-${jadwal.jenisPengajian.replace(/\s+/g, "_")}-${jadwal.tanggal}.xlsx`;
      XLSX.writeFile(wb, namaFile);
    });
  };

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
        <div className="flex w-full sm:w-auto flex-col gap-2 sm:flex-row sm:items-end sm:items-center">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">Hadir</p>
          <p className="text-2xl font-bold text-slate-900">{hitung.hadir}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Izin</p>
          <p className="text-2xl font-bold text-slate-900">{hitung.izin}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">Sakit</p>
          <p className="text-2xl font-bold text-slate-900">{hitung.sakit}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Belum</p>
          <p className="text-2xl font-bold text-slate-900">{hitung.belum}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-end">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Rentang data:</span>
          <span>{jadwal.tanggal}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCetakPDF}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Cetak PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Unduh Excel (.xlsx)
          </button>
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
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Cari nama jamaah, kelompok, desa, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 sm:flex-1"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {totalCount} jamaah
          </span>
        </div>

        <p className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 sm:hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M8 7 4 12l4 5M16 7l4 5-4 5" />
          </svg>
          Geser tabel ke samping untuk melihat kolom lainnya.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
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
                  <td colSpan={4} className="sticky left-0 bg-white px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">Tidak ada jamaah yang cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                grouped.map(({ desa, kelompok, items }, gIdx) => (
                  <React.Fragment key={`${desa}|${kelompok}`}>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center justify-between gap-3">
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
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{j.nama}</td>
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
                              className="w-full min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
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

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
