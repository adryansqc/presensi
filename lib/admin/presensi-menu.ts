import { prisma } from "@/lib/prisma";

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
  user: { role?: string | null; desaId?: string | null; kelompokId?: string | null },
  limit = 30
): Promise<PresensiMenuGroup[]> {
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

  const desaNama = new Map(desaList.map((d) => [d.id, d.nama]));
  const kelompokNama = new Map(kelompokList.map((k) => [k.id, k.nama]));
  const kelompokIdsByDesa = new Map<string, string[]>();
  for (const k of kelompokList) {
    const list = kelompokIdsByDesa.get(k.desaId) ?? [];
    list.push(k.id);
    kelompokIdsByDesa.set(k.desaId, list);
  }

  const role = user.role ?? "";
  const desaId = user.desaId ?? null;
  const kelompokId = user.kelompokId ?? null;

  const visible = jadwal.filter((j) => {
    if (role === "Desa" && desaId) {
      if (j.tingkat === "Daerah") return true;
      if (j.desaIds.includes(desaId)) return true;
      const childKelompok = kelompokIdsByDesa.get(desaId) ?? [];
      return j.kelompokIds.some((id) => childKelompok.includes(id));
    }
    if (role === "Kelompok" && kelompokId) {
      return j.kelompokIds.includes(kelompokId);
    }
    return true;
  });

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
