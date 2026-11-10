"use client";

import { signOut } from "next-auth/react";
import { useSwal } from "@/components/ui/SwalProvider";

export default function SignOutButton({
  className,
  children = "Keluar",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { confirm } = useSwal();

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Keluar dari akun?",
          text: "Anda akan keluar dari sesi ini.",
          tone: "question",
          confirmText: "Ya, keluar",
          cancelText: "Batal",
        });
        if (ok) {
          await signOut({ callbackUrl: "/login" });
        }
      }}
      className={
        className ??
        "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      }
    >
      {children}
    </button>
  );
}
