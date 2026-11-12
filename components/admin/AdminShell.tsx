"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useSwal } from "@/components/ui/SwalProvider";
import type { PresensiMenuGroup } from "@/lib/admin/presensi-menu";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  permission: string;
};
type NavGroup = { title: string; items: NavItem[] };

type IconName =
  | "dashboard"
  | "desa"
  | "kelompok"
  | "kategori"
  | "jamaah"
  | "jadwal"
  | "presensi"
  | "pengguna"
  | "shield"
  | "logout"
  | "menu"
  | "close"
  | "chevron";

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Utama",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "dashboard",
        permission: "dashboard.view",
      },
    ],
  },
  {
    title: "Data Master",
    items: [
      { href: "/admin/desa", label: "Desa", icon: "desa", permission: "desa.view" },
      {
        href: "/admin/kelompok",
        label: "Kelompok",
        icon: "kelompok",
        permission: "kelompok.view",
      },
      {
        href: "/admin/kategori",
        label: "Kategori",
        icon: "kategori",
        permission: "kategori.view",
      },
    ],
  },
  {
    title: "Operasional",
    items: [
      {
        href: "/admin/jamaah",
        label: "Jamaah",
        icon: "jamaah",
        permission: "jamaah.view",
      },
      {
        href: "/admin/jadwal",
        label: "Jadwal",
        icon: "jadwal",
        permission: "jadwal.view",
      },
      {
        href: "/admin/presensi",
        label: "Presensi",
        icon: "presensi",
        permission: "presensi.view",
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        href: "/admin/pengguna",
        label: "Pengguna",
        icon: "pengguna",
        permission: "pengguna.view",
      },
      {
        href: "/admin/role",
        label: "Hak Akses",
        icon: "shield",
        permission: "role.manage",
      },
    ],
  },
];

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "desa":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V8l7-4 7 4v13" />
          <path d="M9 21v-5h6v5" />
          <path d="M9 11h.01M15 11h.01" />
        </svg>
      );
    case "kelompok":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.5 20a4.5 4.5 0 0 1 7 0" />
        </svg>
      );
    case "kategori":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h10" />
          <path d="M4 17h7" />
          <path d="m16 14 2 2 3-3" />
        </svg>
      );
    case "jamaah":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "jadwal":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
          <path d="M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01" />
        </svg>
      );
    case "presensi":
      return (
        <svg {...common}>
          <path d="M9 5h6" />
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="m8.5 12 2.5 2.5L16 9" />
        </svg>
      );
    case "pengguna":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="M18 4h3v3" />
          <path d="m21 4-4 4" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
  }
}

export default function AdminShell({
  user,
  permissions,
  presensiGroups = [],
  children,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null };
  permissions: string[];
  presensiGroups?: PresensiMenuGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [presensiOpenState, setPresensiOpenState] = useState<boolean | null>(null);
  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const { confirm } = useSwal();

  const isPresensiRoute = pathname.startsWith("/admin/presensi");
  const activeJadwalId = isPresensiRoute
    ? pathname.split("/").filter(Boolean)[2] ?? null
    : null;

  const presensiOpen = presensiOpenState ?? isPresensiRoute;

  const isGroupOpen = (group: PresensiMenuGroup) => {
    if (groupState[group.key] !== undefined) return groupState[group.key];
    if (!activeJadwalId) return false;
    return group.items.some((i) => i.id === activeJadwalId);
  };
  const permissionSet = new Set(permissions);
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissionSet.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  const roleLabel = (user.role ?? "Pengguna").replace("_", " ");
  const initial = (user.name ?? user.email ?? "A").trim().charAt(0).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.7-7 10-7 10Z" />
            <path d="M12 3v4" />
            <path d="M8.5 5.5 12 7l3.5-1.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Presensi Jambi</p>
          <p className="truncate text-xs text-slate-400">Kota 1 • Admin Panel</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
          aria-label="Tutup menu"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                if (item.href === "/admin/presensi" && presensiGroups.length > 0) {
                  return (
                    <li key={item.href}>
                      <div
                        className={`flex items-center gap-1 rounded-xl transition ${
                          active
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex flex-1 items-center gap-3 px-3 py-2 text-sm font-medium"
                        >
                          <Icon name={item.icon} className="h-4.5 w-4.5" />
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPresensiOpenState(!presensiOpen)}
                          aria-expanded={presensiOpen}
                          aria-label={presensiOpen ? "Tutup submenu presensi" : "Buka submenu presensi"}
                          className="mr-1.5 rounded-lg p-1.5 transition hover:bg-white/10"
                        >
                          <Icon
                            name="chevron"
                            className={`h-3.5 w-3.5 transition-transform ${presensiOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                      </div>

                      {presensiOpen && (
                        <ul className="mt-1 space-y-1 border-l border-white/10 pl-3 ml-4">
                          {presensiGroups.map((sub) => {
                            const subOpen = isGroupOpen(sub);
                            const subActive = Boolean(
                              activeJadwalId && sub.items.some((i) => i.id === activeJadwalId)
                            );
                            return (
                              <li key={sub.key}>
                                <div className="flex items-center gap-1">
                                  <Link
                                    href={`/admin/presensi?tingkat=${sub.key}`}
                                    onClick={() => setOpen(false)}
                                    className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                                      subActive
                                        ? "text-emerald-300"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    }`}
                                  >
                                    {sub.label}
                                    <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                                      {sub.items.length}
                                    </span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setGroupState((prev) => ({ ...prev, [sub.key]: !subOpen }))
                                    }
                                    aria-expanded={subOpen}
                                    aria-label={`${subOpen ? "Tutup" : "Buka"} daftar jadwal ${sub.label}`}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                                  >
                                    <Icon
                                      name="chevron"
                                      className={`h-3 w-3 transition-transform ${subOpen ? "rotate-90" : ""}`}
                                    />
                                  </button>
                                </div>

                                {subOpen && (
                                  <ul className="mt-1 space-y-0.5 pl-4">
                                    {sub.items.map((j) => {
                                      const isCurrent = pathname === `/admin/presensi/${j.id}`;
                                      return (
                                        <li key={j.id}>
                                          <Link
                                            href={`/admin/presensi/${j.id}`}
                                            onClick={() => setOpen(false)}
                                            title={`${j.jenisPengajian} - ${j.lokasi} - ${j.tanggal}`}
                                            className={`block rounded-lg px-2.5 py-1.5 text-xs transition ${
                                              isCurrent
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            }`}
                                          >
                                            <span className="flex items-center gap-1.5">
                                              <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                  j.statusBuka === "Buka"
                                                    ? "bg-emerald-400"
                                                    : "bg-slate-500"
                                                }`}
                                              />
                                              <span className="truncate">{j.jenisPengajian}</span>
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                              {j.tanggal} • {j.lokasi}
                                            </span>
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name ?? "Pengguna"}</p>
            <p className="truncate text-xs text-slate-400">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Keluar dari akun?",
                text: "Anda akan keluar dari panel administrasi.",
                tone: "question",
                confirmText: "Ya, keluar",
                cancelText: "Batal",
              });
              if (ok) {
                await signOut({ callbackUrl: "/login" });
              }
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Keluar"
            title="Keluar"
          >
            <Icon name="logout" className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Panel Administrasi
            </p>
            <p className="truncate text-sm font-semibold text-slate-800">
              Presensi Pengajian Jambi Kota 1
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user.name ?? "Pengguna"}</p>
              <p className="text-xs text-slate-500">{user.email ?? roleLabel}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {initial}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
