import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permission-store";
import { getPresensiMenuGroups } from "@/lib/admin/presensi-menu";


export const metadata = {
  title: "Admin • Presensi Jambi Kota 1",
};

async function AdminGate({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "";
  const permissions = await getRolePermissions(role);

  const presensiGroups = permissions.includes("presensi.view")
    ? await getPresensiMenuGroups((session.user as { id?: string } | undefined)?.id)
    : [];

  if (permissions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-500">
            Akun Anda belum memiliki izin untuk membuka panel administrasi. Hubungi
            Super Admin untuk mengatur hak akses role Anda.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={{ name: session.user?.name, email: session.user?.email, role }}
      permissions={permissions}
      presensiGroups={presensiGroups}
    >
      {children}
    </AdminShell>
  );
}

function AdminFallback() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-8 lg:px-8">
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200/70" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
