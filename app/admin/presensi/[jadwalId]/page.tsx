import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permission-store";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PresensiDetailManager, { type JamaahRow } from "@/components/admin/PresensiDetailManager";

export const dynamic = "force-dynamic";

type PresensiRow = {
  jamaahId: string | null;
  status: string | null;
  keterangan: string | null;
};

type JadwalInfo = {
  id: string;
  tanggal: string;
  jenisPengajian: string;
  jamMulai: string;
  jamSelesai: string;
  tingkat: string;
  desaIds: string[];
  kelompokIds: string[];
  kategoriIds: string[];
  statusBuka: string;
  lokasi: string;
};

export default async function PresensiDetailPage({
  params,
}: {
  params: Promise<{ jadwalId: string }>;
}) {
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
          <p className="mt-2 text-sm text-slate-500">Anda tidak memiliki izin untuk melakukan presensi.</p>
        </div>
      </div>
    );
  }

  const { jadwalId } = await params;

  const jadwal = await prisma.jadwal.findUnique({
    where: { id: jadwalId },
  });

  if (!jadwal) {
    notFound();
  }

  // Fetch nama desa dan kelompok untuk tampilan lokasi
  const desaNames = await prisma.desa.findMany({
    where: { id: { in: jadwal.desaIds ?? [] } },
    select: { nama: true },
  });
  const kelompokNames = await prisma.kelompok.findMany({
    where: { id: { in: jadwal.kelompokIds ?? [] } },
    select: { nama: true },
  });

  const lokasi =
    kelompokNames.length > 0
      ? kelompokNames.map((k) => k.nama).join(", ")
      : desaNames.length > 0
        ? desaNames.map((d) => d.nama).join(", ")
        : "Daerah";

  const userDesaId = (session.user as { desaId?: string } | undefined)?.desaId ?? null;
  const userKelompokId = (session.user as { kelompokId?: string } | undefined)?.kelompokId ?? null;

  // Filter jamaah berdasarkan kriteria jadwal dan role user
  const jamaahWhere: Record<string, unknown> = { statusAktif: "Aktif" };

  // Filter berdasarkan kategori jamaah (Ibu, Bapak, dll)
  if (jadwal.kategoriIds?.length) {
    jamaahWhere.kategoriId = { in: jadwal.kategoriIds };
  }

  // Filter berdasarkan desa (tingkat Desa atau Daerah dengan desaIds)
  if (jadwal.desaIds?.length) {
    jamaahWhere.desaId = { in: jadwal.desaIds };
  }

  // Filter berdasarkan kelompok (tingkat Kelompok atau Desa dengan kelompokIds)
  if (jadwal.kelompokIds?.length) {
    jamaahWhere.kelompokId = { in: jadwal.kelompokIds };
  }

  // Bataskan cakupan wilayah sesuai role user
  if (role === "Desa" && userDesaId) {
    jamaahWhere.desaId = userDesaId;
  } else if (role === "Kelompok" && userKelompokId) {
    jamaahWhere.kelompokId = userKelompokId;
  }

  const jamaahList = await prisma.jamaah.findMany({
    where: jamaahWhere,
    include: {
      kategori: { select: { nama: true } },
      desa: { select: { nama: true } },
      kelompok: { select: { nama: true } },
    },
    orderBy: { nama: "asc" },
  });

  const jamaahRows: JamaahRow[] = jamaahList.map((j) => ({
    id: j.id,
    nama: j.nama,
    kategoriNama: j.kategori.nama,
    desaNama: j.desa.nama,
    kelompokNama: j.kelompok.nama,
    desaId: j.desaId,
    kelompokId: j.kelompokId,
    noWa: j.noWa,
  }));

  const existingPresensi = await prisma.presensi.findMany({
    where: { jadwalId },
    select: { jamaahId: true, status: true, keterangan: true },
  });

  const presensiMap = new Map<string, PresensiRow>();
  existingPresensi.forEach((p) => {
    if (p.jamaahId) {
      presensiMap.set(p.jamaahId, { jamaahId: p.jamaahId, status: p.status, keterangan: p.keterangan });
    }
  });

  const jadwalInfo: JadwalInfo = {
    id: jadwal.id,
    tanggal: jadwal.tanggal.toISOString().slice(0, 10),
    jenisPengajian: jadwal.jenisPengajian,
    jamMulai: jadwal.jamMulai,
    jamSelesai: jadwal.jamSelesai,
    tingkat: jadwal.tingkat,
    desaIds: jadwal.desaIds ?? [],
    kelompokIds: jadwal.kelompokIds ?? [],
    kategoriIds: jadwal.kategoriIds ?? [],
    statusBuka: jadwal.statusBuka,
    lokasi,
  };

  return (
    <PresensiDetailManager
      jadwal={jadwalInfo}
      jamaah={jamaahRows}
      presensiMap={Object.fromEntries(presensiMap)}
    />
  );
}
