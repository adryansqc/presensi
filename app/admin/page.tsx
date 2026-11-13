import Link from "next/link";
import { getServerSession } from "next-auth";
import { connection } from "next/server";
import PermissionDenied from "@/components/admin/PermissionDenied";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permission-store";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "hadir" || normalized === "buka") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "izin") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized === "sakit") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await connection();
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const permissions = await getRolePermissions(role);

  if (!permissions.includes("dashboard.view")) {
    return (
      <PermissionDenied message="Role Anda tidak memiliki izin untuk melihat dashboard. Silakan hubungi Super Admin." />
    );
  }

  const [
    desaTotal,
    kelompokTotal,
    kategoriTotal,
    jamaahTotal,
    jadwalTotal,
    presensiTotal,
    penggunaTotal,
    desaRingkas,
    jadwalTerbaru,
    presensiTerbaru,
    daftarDesaRingkas,
    daftarKelompokRingkas,
  ] = await Promise.all([
    prisma.desa.count(),
    prisma.kelompok.count(),
    prisma.kategori.count(),
    prisma.jamaah.count(),
    prisma.jadwal.count(),
    prisma.presensi.count(),
    // Akun sistem (hidden) tidak dihitung sebagai pengguna yang dikelola.
    prisma.user.count({ where: { hidden: false } }),
    prisma.desa.findMany({
      orderBy: { nama: "asc" },
      include: { _count: { select: { kelompok: true, jamaah: true } } },
    }),
    prisma.jadwal.findMany({
      take: 5,
      orderBy: { tanggal: "desc" },
    }),
    prisma.presensi.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        jadwal: { select: { tanggal: true, jenisPengajian: true } },
      },
    }),
    prisma.desa.findMany({ select: { id: true, nama: true } }),
    prisma.kelompok.findMany({ select: { id: true, nama: true } }),
  ]);

  const desaMap = new Map(daftarDesaRingkas.map((desa) => [desa.id, desa.nama]));
  const kelompokMap = new Map(daftarKelompokRingkas.map((kelompok) => [kelompok.id, kelompok.nama]));
  const maxKelompok = Math.max(...desaRingkas.map((desa) => desa._count.kelompok), 1);

  const mainStats = [
    {
      label: "Total Jamaah",
      value: jamaahTotal,
      href: "/admin/jamaah",
      hint: "Jamaah terdaftar",
      icon: (
        <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0" />
      ),
    },
    {
      label: "Kelompok",
      value: kelompokTotal,
      href: "/admin/kelompok",
      hint: "Kelompok pengajian",
      icon: (
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 20a5.5 5.5 0 0 1 11 0M17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM14.5 20a4.5 4.5 0 0 1 7 0" />
      ),
    },
    {
      label: "Desa",
      value: desaTotal,
      href: "/admin/desa",
      hint: "Wilayah desa",
      icon: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5" />,
    },
    {
      label: "Jadwal",
      value: jadwalTotal,
      href: "/admin/jadwal",
      hint: "Jadwal pengajian",
      icon: (
        <path d="M4 6h16M4 12h16M4 18h16" />
      ),
    },
  ];

  const secondaryStats = [
    { label: "Kategori", value: kategoriTotal, href: "/admin/kategori" },
    { label: "Presensi", value: presensiTotal, href: "/admin/presensi" },
    { label: "Pengguna", value: penggunaTotal, href: "/admin/pengguna" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Selamat datang, {session?.user?.name ?? "Pengurus"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan data presensi pengajian Jambi Kota 1.
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          {longDateFormatter.format(new Date())}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mainStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  {stat.icon}
                </svg>
              </span>
              <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-600">
                Kelola →
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              {stat.value}
            </p>
            <p className="text-sm font-medium text-slate-700">{stat.label}</p>
            <p className="text-xs text-slate-400">{stat.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {secondaryStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-emerald-200"
          >
            <span className="font-medium text-slate-600">{stat.label}</span>
            <span className="text-lg font-semibold text-slate-900">{stat.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sebaran Kelompok per Desa</h2>
              <p className="text-xs text-slate-500">Jumlah kelompok dan jamaah pada setiap desa.</p>
            </div>
            <Link href="/admin/desa" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              Lihat semua
            </Link>
          </div>

          <div className="mt-5 space-y-3.5">
            {desaRingkas.map((desa) => (
              <div key={desa.id}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{desa.nama}</span>
                  <span className="text-slate-500">
                    {desa._count.kelompok} kelompok • {desa._count.jamaah} jamaah
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${Math.max((desa._count.kelompok / maxKelompok) * 100, 4)}%` }}
                  />
                </div>
              </div>
            ))}
            {desaRingkas.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Belum ada data desa.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Jadwal Terbaru</h2>
            <Link href="/admin/jadwal" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              Semua
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {jadwalTerbaru.map((jadwal) => (
              <li key={jadwal.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {jadwal.jenisPengajian}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateFormatter.format(jadwal.tanggal)} • {jadwal.jamMulai}–{jadwal.jamSelesai}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {jadwal.kelompokIds.length > 0
                        ? jadwal.kelompokIds.map((id) => kelompokMap.get(id)).filter(Boolean).join(", ")
                        : jadwal.desaIds.length > 0
                          ? jadwal.desaIds.map((id) => desaMap.get(id)).filter(Boolean).join(", ")
                          : "Tingkat daerah"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusTone(jadwal.statusBuka)}`}>
                    {jadwal.statusBuka}
                  </span>
                </div>
              </li>
            ))}
            {jadwalTerbaru.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">Belum ada jadwal.</li>
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Presensi Terbaru</h2>
            <Link href="/admin/presensi" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              Semua
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Jamaah</th>
                  <th className="pb-2 pr-4">Jadwal</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presensiTerbaru.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-700 whitespace-nowrap">{item.namaJamaah}</td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {dateFormatter.format(item.jadwal.tanggal)} • {item.jadwal.jenisPengajian}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {presensiTerbaru.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                      Belum ada catatan presensi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Akses Cepat</h2>
          <div className="mt-4 grid gap-2">
            {[
              { href: "/admin/jamaah", label: "Tambah jamaah baru" },
              { href: "/admin/jadwal", label: "Buat jadwal pengajian" },
              { href: "/admin/presensi", label: "Catat presensi" },
              { href: "/admin/pengguna", label: "Kelola akun pengurus" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700"
              >
                {item.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
