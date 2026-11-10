import Link from "next/link";

export default function PermissionDenied({
  message = "Role Anda tidak memiliki izin untuk membuka halaman ini.",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
            <path d="M12 9v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Akses terbatas</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
