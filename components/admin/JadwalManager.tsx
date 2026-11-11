"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";
import CheckboxSearch from "@/components/admin/CheckboxSearch";

type Jadwal = {
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
  slugPublik: string | null;
  linkPublikAktif: boolean;
  dibuatOleh: string | null;
  dibuatOlehUser: { name: string | null; email: string | null } | null;
  presensi: Array<{ id: string; jamaah: { nama: string } | null }>;
  createdAt: string;
  lokasi: string;
};

type Desa = { id: string; nama: string };
type Kelompok = { id: string; nama: string; desaId: string; desaNama: string };
type Kategori = { id: string; nama: string };

type CreateForm = {
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  kategoriIds: string[];
  desaIds: string[];
  kelompokIds: string[];
};

export default function JadwalManager() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [daftarDesa, setDaftarDesa] = useState<Desa[]>([]);
  const [daftarKelompok, setDaftarKelompok] = useState<Kelompok[]>([]);
  const [daftarKategori, setDaftarKategori] = useState<Kategori[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    tanggal: "",
    jenisPengajian: "",
    jamMulai: "",
    jamSelesai: "",
    tingkat: "Kelompok",
    kategoriIds: [],
    desaIds: [],
    kelompokIds: [],
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const swal = useSwal();

  // Kelompok yang tersedia berdasarkan desa yang dipilih (hanya untuk tingkat Desa)
  const kelompokFiltered = useMemo(() => {
    if (createForm.tingkat === "Desa" && createForm.desaIds.length > 0) {
      return daftarKelompok.filter((k) => createForm.desaIds.includes(k.desaId));
    }
    if (createForm.tingkat === "Kelompok") {
      return daftarKelompok;
    }
    return [];
  }, [createForm.tingkat, createForm.desaIds, daftarKelompok]);

  async function refreshData() {
    try {
      const [jRes, dRes, kRes, cRes] = await Promise.all([
        fetch("/api/admin/jadwal", { cache: "no-store" }),
        fetch("/api/admin/desa", { cache: "no-store" }),
        fetch("/api/admin/kelompok", { cache: "no-store" }),
        fetch("/api/admin/kategori", { cache: "no-store" }),
      ]);
      const jData = await jRes.json();
      const dData = await dRes.json();
      const kData = await kRes.json();
      const cData = await cRes.json();

      if (jRes.ok) setJadwalList(Array.isArray(jData) ? jData : []);
      if (dRes.ok) setDaftarDesa(Array.isArray(dData) ? dData : []);
      if (kRes.ok) setDaftarKelompok(Array.isArray(kData) ? kData : []);
      if (cRes.ok) setDaftarKategori(Array.isArray(cData) ? cData : []);
    } catch {
      await swal.error("Gagal memuat data", "Tidak dapat menghubungi server.");
    }
  }

  useEffect(() => {
    let mounted = true;
    refreshData();
    return () => {
      mounted = false;
    };
  }, [swal]);

  function resetCreateForm() {
    setCreateForm({
      tanggal: "",
      jenisPengajian: "",
      jamMulai: "",
      jamSelesai: "",
      tingkat: "Kelompok",
      kategoriIds: [],
      desaIds: [],
      kelompokIds: [],
    });
    setCreateError("");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError("");
    setCreateSaving(true);
    try {
      const res = await fetch("/api/admin/jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: createForm.tanggal || undefined,
          jenisPengajian: createForm.jenisPengajian,
          jamMulai: createForm.jamMulai,
          jamSelesai: createForm.jamSelesai,
          tingkat: createForm.tingkat,
          desaIds: createForm.desaIds,
          kelompokIds: createForm.kelompokIds,
          kategoriIds: createForm.kategoriIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(typeof data?.error === "string" ? data.error : "Gagal membuat jadwal.");
        return;
      }
      setOpenCreate(false);
      resetCreateForm();
      await swal.success("Berhasil dibuat", "Jadwal baru telah ditambahkan.");
      await refreshData();
    } catch {
      setCreateError("Tidak dapat menghubungi server.");
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleBuka(id: string) {
    const res = await fetch(`/api/admin/jadwal/${id}/buka`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      await swal.error("Gagal membuka", typeof data?.error === "string" ? data.error : "");
      return;
    }
    await swal.success("Sesi dibuka", "Jadwal telah dibuka untuk absensi.");
    await refreshData();
  }

  async function handleTutup(id: string) {
    const ok = await swal.confirm({
      title: "Tutup sesi absensi?",
      text: "Setiap ditutup, absensi tidak dapat diubah lagi dan link publik akan tidak berfungsi.",
      tone: "warning",
      confirmText: "Ya, tutup",
      cancelText: "Batal",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/jadwal/${id}/tutup`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      await swal.error("Gagal menutup", typeof data?.error === "string" ? data.error : "");
      return;
    }
    await swal.success("Sesi ditutup", "Absensi telah terkunci.");
    await refreshData();
  }

  async function handleBagikan(id: string) {
    const res = await fetch(`/api/admin/jadwal/${id}/bagikan`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      await swal.error("Gagal generate link", typeof data?.error === "string" ? data.error : "");
      return;
    }
    await swal.alert({
      title: "Link Absensi Publik",
      text: data.link,
      confirmText: "Salin",
    });
    await refreshData();
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const tampilkanKelompok = (jadwal: Jadwal) => {
    if (jadwal.kelompokIds.length > 0) {
      return jadwal.kelompokIds
        .map((id) => {
          const k = daftarKelompok.find((x) => x.id === id);
          return k ? k.nama : id;
        })
        .join(", ");
    }
    if (jadwal.desaIds.length > 0) {
      return jadwal.desaIds
        .map((id) => {
          const d = daftarDesa.find((x) => x.id === id);
          return d ? d.nama : id;
        })
        .join(", ");
    }
    return "Daerah";
  };

  const tampilkanKategori = (jadwal: Jadwal) => {
    if (jadwal.kategoriIds.length > 0) {
      return jadwal.kategoriIds
        .map((id) => {
          const k = daftarKategori.find((x) => x.id === id);
          return k ? k.nama : id;
        })
        .join(", ");
    }
    return "-";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Kelola Jadwal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat jadwal pengajian, pilih kategori jamaah (Bapak/Ibu), atur cakupan desa/kelompok, buka/tutup sesi absensi, dan bagikan link publik.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Jadwal
        </button>
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setOpenCreate(false)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Jadwal</h2>
                <p className="mt-0.5 text-xs text-slate-500">Isi jadwal pengajian yang akan dibuat.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {createError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {createError}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="jadwal-jenis" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Jenis Pengajian
                    </label>
                    <input
                      id="jadwal-jenis"
                      type="text"
                      value={createForm.jenisPengajian}
                      onChange={(e) => setCreateForm({ ...createForm, jenisPengajian: e.target.value })}
                      placeholder="Contoh: Pengajian Rutin"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label htmlFor="jadwal-tanggal" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Tanggal <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <input
                      id="jadwal-tanggal"
                      type="date"
                      value={createForm.tanggal}
                      onChange={(e) => setCreateForm({ ...createForm, tanggal: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label htmlFor="jadwal-jam-mulai" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Jam Mulai <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <input
                      id="jadwal-jam-mulai"
                      type="time"
                      value={createForm.jamMulai}
                      onChange={(e) => setCreateForm({ ...createForm, jamMulai: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label htmlFor="jadwal-jam-selesai" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Jam Selesai <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <input
                      id="jadwal-jam-selesai"
                      type="time"
                      value={createForm.jamSelesai}
                      onChange={(e) => setCreateForm({ ...createForm, jamSelesai: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label htmlFor="jadwal-tingkat" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Tingkat <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <select
                      id="jadwal-tingkat"
                      value={createForm.tingkat}
                      onChange={(e) => {
                        const nilai = e.target.value;
                        setCreateForm((prev) => ({
                          ...prev,
                          tingkat: nilai,
                          desaIds: nilai === "Desa" ? prev.desaIds : [],
                          kelompokIds: nilai === "Kelompok" ? prev.kelompokIds : [],
                        }));
                      }}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="Daerah">Daerah (semua wilayah)</option>
                      <option value="Desa">Desa (pilih desa, lalu kelompok)</option>
                      <option value="Kelompok">Kelompok (pilih kelompok langsung)</option>
                    </select>
                  </div>

                  {/* Kategori Jamaah - selalu ditampilkan */}
                  <div className="sm:col-span-2">
                    <CheckboxSearch
                      items={daftarKategori.map((kat) => ({ id: kat.id, label: kat.nama }))}
                      selected={createForm.kategoriIds}
                      onChange={(ids) => setCreateForm({ ...createForm, kategoriIds: ids })}
                      label="Kategori Jamaah"
                      placeholder="Cari kategori (Bapak, Ibu, dll)..."
                      required
                      maxHeight="180px"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Pilih satu atau lebih kategori jamaah (contoh: Bapak, Ibu).
                    </p>
                  </div>

                  {/* Desa - hanya untuk tingkat Desa */}
                  {createForm.tingkat === "Desa" && (
                    <div className="sm:col-span-2">
                      <CheckboxSearch
                        items={daftarDesa.map((d) => ({ id: d.id, label: d.nama }))}
                        selected={createForm.desaIds}
                        onChange={(ids) =>
                          setCreateForm({ ...createForm, desaIds: ids, kelompokIds: [] })
                        }
                        label="Desa"
                        placeholder="Cari desa..."
                        required
                        maxHeight="180px"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Pilih satu atau lebih desa. Kelompok akan muncul berdasarkan desa yang dipilih.
                      </p>
                    </div>
                  )}

                  {/* Kelompok - untuk tingkat Desa (berdasarkan desa terpilih) atau Kelompok (semua) */}
                  {(createForm.tingkat === "Desa" || createForm.tingkat === "Kelompok") && (
                    <div className="sm:col-span-2">
                      <CheckboxSearch
                        items={kelompokFiltered.map((k) => ({
                          id: k.id,
                          label: `${k.desaNama} — ${k.nama}`,
                        }))}
                        selected={createForm.kelompokIds}
                        onChange={(ids) => setCreateForm({ ...createForm, kelompokIds: ids })}
                        label="Kelompok"
                        placeholder="Cari kelompok..."
                        required
                        disabled={kelompokFiltered.length === 0}
                        maxHeight="180px"
                      />
                      {kelompokFiltered.length === 0 && createForm.tingkat === "Desa" && createForm.desaIds.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Pilih desa terlebih dahulu untuk menampilkan kelompok.
                        </p>
                      ) : kelompokFiltered.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Tidak ada kelompok yang tersedia.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          Pilih satu atau lebih kelompok.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  disabled={createSaving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {createSaving ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Jenis Pengajian</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Tingkat</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jadwalList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">Belum ada jadwal</p>
                    <p className="mt-1 text-sm text-slate-500">Buat jadwal pertama Anda.</p>
                  </td>
                </tr>
              )}
              {jadwalList.map((j) => (
                <tr key={j.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-700">{formatDate(j.tanggal)}</td>
                  <td className="px-4 py-3 text-slate-700">{j.jenisPengajian}</td>
                  <td className="px-4 py-3 text-slate-700">{j.jamMulai} - {j.jamSelesai}</td>
                  <td className="px-4 py-3 text-slate-700">{j.tingkat}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm">{tampilkanKategori(j)}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm">{tampilkanKelompok(j)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                        j.statusBuka === "Buka"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {j.statusBuka === "Buka" ? "Buka" : "Tutup"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {j.statusBuka === "Tutup" && (
                        <button
                          type="button"
                          onClick={() => handleBuka(j.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Buka Sesi"
                          aria-label="Buka sesi absensi"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M5 12h14M12 5v14" />
                          </svg>
                        </button>
                      )}
                      {j.statusBuka === "Buka" && (
                        <button
                          type="button"
                          onClick={() => handleTutup(j.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          title="Tutup Sesi"
                          aria-label="Tutup sesi absensi"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      )}
                      {j.statusBuka === "Buka" && j.linkPublikAktif && j.slugPublik && (
                        <button
                          type="button"
                          onClick={() => handleBagikan(j.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                          title="Bagikan Link"
                          aria-label="Bagikan link absensi publik"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M4 7v10c0 2 2 4 4 4h12c2 0 4-2 4-4V7" />
                            <path d="M12 15V3" />
                            <path d="M7 10l5 5 5-5" />
                          </svg>
                        </button>
                      )}
                      {(!j.linkPublikAktif || !j.slugPublik) && j.statusBuka === "Buka" && (
                        <button
                          type="button"
                          onClick={() => handleBagikan(j.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                          title="Buat Link Publik"
                          aria-label="Buat link absensi publik"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="14 2 2 12 14 22" />
                            <path d="M2 12h20" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jadwalList.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              Jadwal buka:{" "}
              <span className={`font-medium ${jadwalList.filter((j) => j.statusBuka === "Buka").length > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                {jadwalList.filter((j) => j.statusBuka === "Buka").length} sesi buka
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
