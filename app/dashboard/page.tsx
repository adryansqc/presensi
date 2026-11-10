import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SignOutButton from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permission-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connection();
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string } | undefined)?.role;
  const permissions = await getRolePermissions(role ?? "");

  if (permissions.length > 0) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          Halo, {session.user?.name ?? "Pengurus"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Akun Anda memiliki role{" "}
          <span className="font-medium text-slate-700">
            {(role ?? "Pengguna").replace("_", " ")}
          </span>
          . Panel administrasi hanya tersedia untuk Super Admin dan Admin CAI.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
