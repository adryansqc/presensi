import { prisma } from "@/lib/prisma";
import { getScope, jadwalVisible, type ScopeMaps } from "@/lib/admin/scope";

export type PresensiMenuJadwal = {
  id: string;
  jenisPengajian: string;
  tanggal: string;
  tingkat: string;
  statusBuka: string;
  lokasi: string;
};

export type PresensiMenuGroup = {
  key: string;
  label: string;
  items: PresensiMenuJadwal[];
};

const TINGKAT_ORDER = ["Daerah", "Desa", "Kelompok"];

const TINGKAT_LABEL: Record<string, string> = {
  Daerah: "Daerah",
  Desa: "Desa",
  Kelompok: "Kelompok",
};

function formatTanggal(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getPresensiMenuGroups(
  userId: string | undefined,
  limit = 30
): Promise<PresensiMenuGroup[]> {
  const scope = await getScope(userId);
  if (!scope) return [];
  const jadwal = await prisma.jadwal.findMany({
    orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    take: limit * 4,
    select: {
      id: true,
      jenisPengajian: true,
      tanggal: true,
      tingkat: true,
      statusBuka: true,
      desaIds: true,
      kelompokIds: true,
    },
  });

  const [desaList, kelompokList] = await Promise.all([
    prisma.desa.findMany({ select: { id: true, nama: true } }),
    prisma.kelompok.findMany({ select: { id: true, nama: true, desaId: true } }),
  ]);

  const maps: ScopeMaps = {
    kelompokToDesa: new Map(kelompokList.map((k) => [k.id, k.desaId] as const)),
  };

  const desaNama = new Map(desaList.map((d) => [d.id, d.nama]));
  const kelompokNama = new Map(kelompokList.map((k) => [k.id, k.nama]));
  const visible = jadwal.filter((j) =>
    jadwalVisible(
      scope,
      {
        tingkat: j.tingkat,
        desaIds: j.desaIds ?? [],
        kelompokIds: j.kelompokIds ?? [],
      },
      maps
    )
  );

  const groups: PresensiMenuGroup[] = TINGKAT_ORDER.map((key) => ({
    key,
    label: TINGKAT_LABEL[key] ?? key,
    items: [],
  }));

  const groupByKey = new Map(groups.map((g) => [g.key, g]));

  for (const j of visible) {
    const group = groupByKey.get(j.tingkat);
    if (!group) continue;
    if (group.items.length >= limit) continue;

    const namaKelompok = j.kelompokIds.map((id) => kelompokNama.get(id)).filter(Boolean);
    const namaDesa = j.desaIds.map((id) => desaNama.get(id)).filter(Boolean);
    const lokasi =
      namaKelompok.length > 0
        ? namaKelompok.join(", ")
        : namaDesa.length > 0
          ? namaDesa.join(", ")
          : "Seluruh Daerah";

    group.items.push({
      id: j.id,
      jenisPengajian: j.jenisPengajian,
      tanggal: formatTanggal(j.tanggal),
      tingkat: j.tingkat,
      statusBuka: j.statusBuka,
      lokasi,
    });
  }

  return groups.filter((g) => g.items.length > 0);
}
