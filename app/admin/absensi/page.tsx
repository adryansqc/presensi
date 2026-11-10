import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permission-store";
import AbsensiManager from "@/components/admin/AbsensiManager";

export const dynamic = "force-dynamic";

export default async function AbsensiPage() {
  await connection();
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string } | undefined)?.role ?? "";
  const permissions = await getRolePermissions(role);

  if (!permissions.includes("presensi.create")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Akses terbatas</h1>
          <p className="mt-2 text-sm text-slate-500">Anda tidak memiliki izin untuk mengabsen.</p>
        </div>
      </div>
    );
  }

  return <AbsensiManager />;
}
