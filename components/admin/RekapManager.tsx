"use client";

import { useCallback, useEffect, useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";

type JadwalItem = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  statusBuka: string;
};

type RekapData = {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  sumberPengurus: number;
  sumberPublik: number;
  rincianDesa: Array<{
    desa: string;
    kelompok: Array<{
      kelompok: string;
      hadir: number;
      izin: number;
      sakit: number;
      total: number;
    }>;
  }>;
};

export default function RekapManager() {
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(false);
  const swal = useSwal();

  const loadRekap = useCallback(async (jadwalId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/presensi/rekap?jadwalId=${jadwalId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setRekap(data as RekapData);
      } else {
        await swal.error("Gagal memuat rekap", typeof data?.error === "string" ? data.error : "");
      }
    } catch {
      await swal.error("Gagal memuat rekap", "Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [swal]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/jadwal", { cache: "no-store" });
        const data = (await res.json()) as JadwalItem[];
        if (!mounted) return;
        if (res.ok && Array.isArray(data)) {
          setJadwalList(data);
          if (data.length > 0) {
            setSelectedId(data[0].id);
            await loadRekap(data[0].id);
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
  }, [swal, loadRekap]);

  const currentJadwal = jadwalList.find((j) => j.id === selectedId) ?? null;

  if (!currentJadwal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Belum ada jadwal</h1>
          <p className="mt-2 text-sm text-slate-500">Buat jadwal terlebih dahulu untuk melihat rekap.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Rekap Absensi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lihat rekap kehadiran per jadwal pengajian.
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setRekap(null);
            loadRekap(e.target.value);
          }}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
        >
          {jadwalList.map((j) => (
            <option key={j.id} value={j.id}>
              {j.jenisPengajian} - {j.tanggal} ({j.statusBuka})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-3 border-slate-200 border-t-emerald-600" />
        </div>
      )}

      {!loading && rekap && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan</h2>
            <div className="mt-4 grid gap-2 text-center">
              <div className="p-3 rounded-xl bg-emerald-50">
                <div className="text-xs text-emerald-600 font-medium uppercase">Hadir</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.hadir}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <div className="text-xs text-amber-600 font-medium uppercase">Izin</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.izin}</div>
              </div>
              <div className="p-3 rounded-xl bg-red-50">
                <div className="text-xs text-red-600 font-medium uppercase">Sakit</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.sakit}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-xs text-slate-600 font-medium uppercase">Total</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.total}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-center">
              <div className="p-3 rounded-xl bg-blue-50">
                <div className="text-xs text-blue-600 font-medium uppercase">Sumber: Pengurus</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.sumberPengurus}</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50">
                <div className="text-xs text-indigo-600 font-medium uppercase">Sumber: Publik</div>
                <div className="text-2xl font-bold text-slate-900">{rekap.sumberPublik}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Rincian per Desa → Kelompok</h2>
            <div className="mt-3 space-y-2">
              {rekap.rincianDesa.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">Belum ada data rincian.</p>
              ) : (
                rekap.rincianDesa.map((d) => (
                  <div key={d.desa} className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                      {d.desa}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {d.kelompok.map((k) => (
                        <div key={k.kelompok} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-slate-700">{k.kelompok}</span>
                          <span className="flex gap-2 text-slate-500">
                            <span className="text-emerald-600">H{k.hadir}</span>
                            <span className="text-amber-600">I{k.izin}</span>
                            <span className="text-red-600">S{k.sakit}</span>
                            <span className="text-slate-400">T{k.total}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
