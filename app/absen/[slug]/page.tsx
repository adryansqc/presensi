"use client";

import { useCallback, useEffect, useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";

type JamaahOption = {
  id: string;
  nama: string;
  desa: { nama: string };
  kelompok: { nama: string };
};

type JadwalPublic = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  statusBuka: string;
  slugPublik: string | null;
};

type RekapData = {
  hadir: number;
  izin: number;
  sakit: number;
  total: number;
  sumberPublik: number;
};

export default function PublicAbsenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [jadwal, setJadwal] = useState<JadwalPublic | null>(null);
  const [jadwalError, setJadwalError] = useState<string | null>(null);
  const [jamaahOptions, setJamaahOptions] = useState<JamaahOption[]>([]);
  const [selectedJamaah, setSelectedJamaah] = useState<string>("");
  const [selectedJamaahLabel, setSelectedJamaahLabel] = useState("");
  const [status, setStatus] = useState("Izin");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const swal = useSwal();

  const loadRekap = useCallback(async (jadwalId: string) => {
    try {
      const res = await fetch(
        `/api/admin/presensi/rekap?jadwalId=${jadwalId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setRekap(data as RekapData);
      }
    } catch {
      // Rekap API requires auth, may fail publicly - ignore
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { slug } = await params;
        const res = await fetch(`/api/public/jadwal/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        if (res.ok) {
          setJadwal(data.jadwal);
          await loadRekap(data.jadwal.id);
        } else {
          setJadwalError(data.error || "Jadwal tidak ditemukan.");
        }
      } catch {
        if (mounted) {
          setJadwalError("Tidak dapat memuat jadwal.");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params, swal, loadRekap]);

  async function searchJamaah(q: string) {
    if (!q.trim()) {
      setJamaahOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/public/jamaah?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJamaahOptions(data);
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedJamaah) {
      await swal.error("Pilih jamaah", "Silakan pilih nama jamaah dari daftar.");
      return;
    }
    setSubmitting(true);
    try {
      const { slug } = await params;
      const res = await fetch(`/api/absen/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jamaahId: selectedJamaah,
          status,
          keterangan: keterangan || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await swal.error("Gagal mengirim", typeof data?.error === "string" ? data.error : "");
        return;
      }
      await swal.success("Terima kasih", data.message || "Absensi Anda telah tercatat.");
      setSelectedJamaah("");
      setSelectedJamaahLabel("");
      setStatus("Izin");
      setKeterangan("");
    } catch {
      await swal.error("Gagal mengirim", "Tidak dapat menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  const isClosed = jadwal?.statusBuka !== "Buka";
  const isInvalidLink = !!jadwalError;

  return (
    <div className="min-h-screen bg-slate-50">
      {isInvalidLink && (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Link tidak valid</h1>
            <p className="mt-2 text-sm text-slate-500">{jadwalError}</p>
          </div>
        </div>
      )}

      {!isInvalidLink && jadwal && (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Absensi Publik</h1>
                <p className="text-sm text-slate-500">
                  {jadwal.jenisPengajian} - {jadwal.tingkat}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  jadwal.statusBuka === "Buka"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {jadwal.statusBuka === "Buka" ? "Sesi Buka" : "Sesi Ditutup"}
              </span>
            </div>

            <p className="text-sm text-slate-600 mb-1">
              {jadwal.jamMulai} - {jadwal.jamSelesai} • {jadwal.tanggal}
            </p>

            <p className="text-xs text-slate-400 mb-4">
              Form ini hanya untuk Izin atau Sakit. Untuk Hadir, silakan hubungi pengurus langsung.
            </p>

            {isClosed ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-600">
                  Sesi absensi sudah ditutup. Tidak dapat mengirim absensi lagi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="public-jamaah" className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Jamaah
                  </label>
                  <div className="relative">
                    <input
                      id="public-jamaah"
                      type="text"
                      value={selectedJamaahLabel}
                      onChange={(e) => {
                        setSelectedJamaahLabel(e.target.value);
                        searchJamaah(e.target.value);
                      }}
                      placeholder="Cari nama jamaah..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                      list="jamaah-list"
                    />
                    <datalist id="jamaah-list">
                      {jamaahOptions.map((j) => (
                        <option key={j.id} value={j.nama}>
                          {j.kelompok.nama} - {j.desa.nama}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <input
                    type="hidden"
                    value={selectedJamaah}
                    onChange={(e) => setSelectedJamaah(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="Izin"
                          checked={status === "Izin"}
                          onChange={() => setStatus("Izin")}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        Izin
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="Sakit"
                          checked={status === "Sakit"}
                          onChange={() => setStatus("Sakit")}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        Sakit
                      </label>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={submitting || !selectedJamaah}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Mengirim..." : "Kirim"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="public-keterangan" className="block text-sm font-medium text-slate-700 mb-1">
                    Keterangan (opsional)
                  </label>
                  <textarea
                    id="public-keterangan"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    rows={3}
                    placeholder="Catatan tambahan..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                  />
                </div>
              </form>
            )}
          </div>

          {rekap && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Rekap Kehadiran Acara</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-center">
                  <div className="text-xs text-emerald-600 font-medium uppercase">Hadir</div>
                  <div className="text-2xl font-bold text-slate-900">{rekap.hadir}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-center">
                  <div className="text-xs text-amber-600 font-medium uppercase">Izin</div>
                  <div className="text-2xl font-bold text-slate-900">{rekap.izin}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 text-center">
                  <div className="text-xs text-red-600 font-medium uppercase">Sakit</div>
                  <div className="text-2xl font-bold text-slate-900">{rekap.sakit}</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 text-center">
                Total: {rekap.total} data • Sumber publik: {rekap.sumberPublik}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
