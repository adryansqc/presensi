import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SwalProvider } from "@/components/ui/SwalProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    template: "%s | Presensi Jambi Kota 1",
    default: "Presensi Jambi Kota 1",
  },
  description:
    "Sistem informasi presensi pengajian Jambi Kota 1 — kelola jamaah, jadwal, dan kehadiran secara terpadu.",
  authors: [{ name: "Presensi Jambi Kota 1" }],
  openGraph: {
    title: "Presensi Jambi Kota 1",
    description:
      "Sistem informasi presensi pengajian Jambi Kota 1 — kelola jamaah, jadwal, dan kehadiran secara terpadu.",
    url: siteUrl,
    siteName: "Presensi Jambi Kota 1",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Presensi Jambi Kota 1",
    description:
      "Sistem informasi presensi pengajian Jambi Kota 1 — kelola jamaah, jadwal, dan kehadiran secara terpadu.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SwalProvider>{children}</SwalProvider>
      </body>
    </html>
  );
}
