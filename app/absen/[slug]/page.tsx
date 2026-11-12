"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";

type JamaahOption = {
  id: string;
  nama: string;
  kategoriId: string;
  desaId: string;
  kelompokId: string;
  desa: { nama: string };
  kelompok: { nama: string };
};

type DesaOption = { id: string; nama: string };
type KelompokOption = { id: string; nama: string; desaId: string; desaNama: string };

type JadwalPublic = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  statusBuka: string;
  slugPublik: string | null;
  kategoriIds: string[];
  desa: DesaOption[];
  kelompok: KelompokOption[];
};

type RekapData = {
  hadir: number;
  izin: number;
  sakit: number;
  total: number;
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

export default function PublicAbsenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [jadwal, setJadwal] = useState<JadwalPublic | null>(null);
  const [jadwalError, setJadwalError] = useState<string | null>(null);
  const [desaId, setDesaId] = useState("");
  const [kelompokId, setKelompokId] = useState("");
  const [cariNama, setCariNama] = useState("");
  const [daftarJamaah, setDaftarJamaah] = useState<JamaahOption[]>([]);
  const [memuatJamaah, setMemuatJamaah] = useState(false);
  const [selectedJamaah, setSelectedJamaah] = useState("");
  const [selectedJamaahLabel, setSelectedJamaahLabel] = useState("");
  const [status, setStatus] = useState("Izin");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const swal = useSwal();

  const loadRekap = useCallback(async (jadwalId: string) => {
    try {
      const res = await fetch(
        `/api/public/presensi/${jadwalId}/rekap`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setRekap(data as RekapData);
      }
    } catch {
      // Rekap may fail publicly - ignore
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

  async function loadJamaah(kelompok: string) {
    if (!kelompok) {
      setDaftarJamaah([]);
      return;
    }
    setMemuatJamaah(true);
    try {
      const res = await fetch(`/api/public/jamaah?kelompokId=${encodeURIComponent(kelompok)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDaftarJamaah(data);
      }
    } catch {
      // ignore
    } finally {
      setMemuatJamaah(false);
    }
  }

  function handleGantiDesa(value: string) {
    setDesaId(value);
    setKelompokId("");
    setDaftarJamaah([]);
    setSelectedJamaah("");
    setSelectedJamaahLabel("");
    setCariNama("");
  }

  function handleGantiKelompok(value: string) {
    setKelompokId(value);
    setSelectedJamaah("");
    setSelectedJamaahLabel("");
    setCariNama("");
    loadJamaah(value);
  }

  function pilihNama(jamaah: JamaahOption) {
    setSelectedJamaah(jamaah.id);
    setSelectedJamaahLabel(jamaah.nama);
  }

  const daftarTersaring = useMemo(() => {
    // Hanya nama yang sesuai kategori acara ini (Bapak, Ibu, dll)
    const kategoriIds = jadwal?.kategoriIds ?? [];
    const sesuaiKategori =
      kategoriIds.length === 0
        ? daftarJamaah
        : daftarJamaah.filter((j) => kategoriIds.includes(j.kategoriId));

    const needle = cariNama.trim().toLowerCase();
    if (!needle) return sesuaiKategori;
    return sesuaiKategori.filter((j) => j.nama.toLowerCase().includes(needle));
  }, [daftarJamaah, cariNama, jadwal]);

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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="public-desa" className="block text-sm font-medium text-slate-700 mb-1">
                      Desa
                    </label>
                    <select
                      id="public-desa"
                      value={desaId}
                      onChange={(e) => handleGantiDesa(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    >
                      <option value="">-- Pilih Desa --</option>
                      {(jadwal?.desa ?? []).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="public-kelompok" className="block text-sm font-medium text-slate-700 mb-1">
                      Kelompok
                    </label>
                    <select
                      id="public-kelompok"
                      value={kelompokId}
                      onChange={(e) => handleGantiKelompok(e.target.value)}
                      required
                      disabled={!desaId}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">-- Pilih Kelompok --</option>
                      {(jadwal?.kelompok ?? [])
                        .filter((k) => k.desaId === desaId)
                        .map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.nama}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="public-cari" className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Jamaah
                  </label>
                  <input
                    id="public-cari"
                    type="search"
                    value={cariNama}
                    onChange={(e) => setCariNama(e.target.value)}
                    placeholder={kelompokId ? "Cari nama sesuai kelompok..." : "Pilih kelompok terlebih dahulu"}
                    disabled={!kelompokId}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />

                  {selectedJamaah && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="text-sm font-medium text-emerald-800">
                        {selectedJamaahLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJamaah("");
                          setSelectedJamaahLabel("");
                        }}
                        className="text-xs font-semibold text-emerald-700 underline"
                      >
                        Ganti
                      </button>
                    </div>
                  )}

                  {kelompokId && !selectedJamaah && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {memuatJamaah ? (
                        <p className="px-3 py-3 text-sm text-slate-500">Memuat daftar nama...</p>
                      ) : daftarTersaring.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-slate-500">
                          {cariNama.trim()
                            ? "Tidak ada nama yang cocok di kelompok ini."
                            : "Belum ada jamaah terdaftar di kelompok ini."}
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {daftarTersaring.map((j) => (
                            <li key={j.id}>
                              <button
                                type="button"
                                onClick={() => pilihNama(j)}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                              >
                                <span className="font-medium">{j.nama}</span>
                                <span className="text-xs text-slate-400">
                                  {j.kelompok.nama} - {j.desa.nama}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus("Izin")}
                        className={`flex h-10 items-center justify-center rounded-xl text-sm font-medium transition border px-3 ${
                          status === "Izin"
                            ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Izin
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("Sakit")}
                        className={`flex h-10 items-center justify-center rounded-xl text-sm font-medium transition border px-3 ${
                          status === "Sakit"
                            ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Sakit
                      </button>
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
              <div className="grid gap-4 md:grid-cols-3 mb-6">
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
              <p className="text-xs text-slate-500 text-center mb-6">
                Total: {rekap.total} data • Sumber publik: {rekap.sumberPublik}
              </p>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Rincian per Desa → Kelompok
              </h3>
              <div className="space-y-2">
                {rekap.rincianDesa.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Belum ada data rincian.</p>
                ) : (
                  rekap.rincianDesa.map((d) => {
                    const desaHadir = d.kelompok.reduce((acc, k) => acc + k.hadir, 0);
                    const desaIzin = d.kelompok.reduce((acc, k) => acc + k.izin, 0);
                    const desaSakit = d.kelompok.reduce((acc, k) => acc + k.sakit, 0);
                    const desaTotal = d.kelompok.reduce((acc, k) => acc + k.total, 0);
                    return (
                      <div key={d.desa} className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm text-slate-900">{d.desa}</div>
                            <div className="flex gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="text-emerald-600 font-bold">Hadir {desaHadir}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-amber-600 font-bold">Izin {desaIzin}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-red-600 font-bold">Sakit {desaSakit}</span>
                              </span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <span className="font-bold">Total {desaTotal}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {d.kelompok.map((k) => (
                            <div key={k.kelompok} className="flex items-center justify-between px-4 py-3 text-sm">
                              <div>
                                <span className="text-slate-700 font-medium">{k.kelompok}</span>
                              </div>
                              <div className="flex gap-3 text-xs font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="text-emerald-600">Hadir {k.hadir}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="text-amber-600">Izin {k.izin}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="text-red-600">Sakit {k.sakit}</span>
                                </span>
                                <span className="flex items-center gap-1 text-slate-500">
                                  <span className="font-bold">Total {k.total}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
