import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-white"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  Presensi Jambi Kota 1
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Masuk Administrator
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 lg:py-40">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-6">
              <span className="relative -top-[1px] h-2 w-2 rounded-full bg-emerald-500" />
              Sistem Informasi Presensi Jamaah
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Kelola Presensi Jamaah<br />
              <span className="text-emerald-600">Secara Mudah &amp; Terpadu</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Aplikasi presensi pengajian untuk kemudahan pengurus dalam mencatat kehadiran jamaah,
              mengatur jadwal, dan melihat rekap kehadiran per desa maupun kelompok.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 transition sm:px-8 sm:py-3.5"
              >
                Masuk Sebagai Administrator
              </Link>
            </div>
          </div>

          <div className="mt-20 relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl blur opacity-20" />
            <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
                Fitur Utama
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-100 hover:bg-emerald-50 transition">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-600">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Manajemen Jadwal</h4>
                  <p className="text-sm text-slate-600">
                    Buat jadwal pengajian, atur tingkat (Daerah/Desa/Kelompok), dan tentukan kategori jamaah yang diundang.
                  </p>
                </div>
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-100 hover:bg-emerald-50 transition">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-600">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Presensi Jamaah</h4>
                  <p className="text-sm text-slate-600">
                    Tandai kehadiran jamaah sebagai Hadir, Izin, atau Sakit per jadwal yang dibuka.
                  </p>
                </div>
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-100 hover:bg-emerald-50 transition">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-600">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Rekap Kehadiran</h4>
                  <p className="text-sm text-slate-600">
                    Lihat rekap presensi per desa dan kelompok dengan jumlah Hadir, Izin, dan Sakit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            Presensi Jambi Kota 1 • Sistem Informasi Jamaah
          </p>
          <div className="flex items-center gap-6">
            <a href="/login" className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition">
              Login Administrator
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
