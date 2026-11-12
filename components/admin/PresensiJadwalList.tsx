"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSwal } from "@/components/ui/SwalProvider";

type JadwalItem = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  desaId: string | null;
  kelompokId: string | null;
  lokasi: string;
  statusBuka: string;
};

const TINGKAT_TABS = ["Semua", "Daerah", "Desa", "Kelompok"] as const;

export default function PresensiJadwalList({ tingkat }: { tingkat: string }) {
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const swal = useSwal();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/jadwal", { cache: "no-store" });
        const data = (await res.json()) as JadwalItem[];
        if (!mounted) return;
        if (res.ok && Array.isArray(data)) {
          setJadwalList(data);
        } else {
          await swal.error("Gagal memuat jadwal", "Tidak dapat menghubungi server.");
        }
      } catch {
        if (mounted) {
          await swal.error("Gagal memuat jadwal", "Tidak dapat menghubungi server.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [swal]);

  const filtered = useMemo(() => {
    let list = jadwalList;
    if (tingkat && tingkat !== "Semua") {
      list = list.filter((j) => j.tingkat === tingkat);
    }
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((j) =>
      j.jenisPengajian.toLowerCase().includes(needle) ||
      j.lokasi.toLowerCase().includes(needle) ||
      j.tanggal.includes(needle)
    );
  }, [jadwalList, query, tingkat]);

  const statusBadge = (status: string) => {
    const isOpen = status === "Buka";
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}>
        {isOpen ? "● Buka" : "○ Tutup"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Daftar Jadwal</h1>
          <p className="mt-1 text-sm text-slate-500">Pilih jadwal untuk melakukan presensi jamaah.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <input
            type="text"
            placeholder="Cari jenis pengajian, lokasi, atau tanggal..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TINGKAT_TABS.map((tab) => {
          const active = tab === tingkat;
          return (
            <Link
              key={tab}
              href={tab === "Semua" ? "/admin/presensi" : `/admin/presensi?tingkat=${tab}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Jenis Pengajian</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Waktu</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tingkat</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lokasi</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">Tidak ada jadwal yang ditemukan.</p>
                </td>
              </tr>
            ) : (
              filtered.map((j) => (
                <tr key={j.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm text-slate-700">{j.tanggal}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{j.jenisPengajian}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{j.jamMulai} - {j.jamSelesai}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      j.tingkat === "Daerah"
                        ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                        : j.tingkat === "Desa"
                        ? "border-amber-200 text-amber-700 bg-amber-50"
                        : "border-emerald-200 text-emerald-700 bg-emerald-50"
                    }`}>
                      {j.tingkat}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{j.lokasi}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{statusBadge(j.statusBuka)}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <Link
                      href={`/admin/presensi/${j.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Lihat &amp; Absensi
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
