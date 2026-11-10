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

export const metadata: Metadata = {
  title: "Presensi Jambi Kota 1",
  description:
    "Sistem informasi presensi pengajian Jambi Kota 1 — kelola jamaah, jadwal, dan kehadiran.",
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
