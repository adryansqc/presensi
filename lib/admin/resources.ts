import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAllRoleDefinitions } from "@/lib/permission-store";
import {
  assertMasterDataWritable,
  assertWithinScope,
  jadwalVisible,
  scopedWhere,
  type Scope,
  type ScopeMaps,
} from "@/lib/admin/scope";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "date"
  | "time"
  | "textarea"
  | "select"
  | "checkbox";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: FieldOption[];
  defaultValue?: string | boolean | number | string[];
  multiSelect?: boolean;
  /** Tampilkan field hanya bila field lain bernilai tertentu. */
  visibleWhen?: { field: string; equals?: string; notEquals?: string[] };
};

export type ColumnType = "text" | "badge" | "date" | "datetime" | "number";

export type ColumnDef = {
  key: string;
  label: string;
  type?: ColumnType;
};

export type CrudRow = Record<string, unknown>;
export type CrudInput = Record<string, unknown>;

export type ResourceConfig = {
  key: string;
  label: string;
  singular: string;
  description: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchKeys: string[];
  list: (scope: Scope) => Promise<CrudRow[]>;
  create: (input: CrudInput, scope: Scope) => Promise<unknown>;
  update: (id: string, input: CrudInput, scope: Scope) => Promise<unknown>;
  remove: (id: string, scope: Scope) => Promise<unknown>;
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

function requireString(input: CrudInput, name: string, label: string) {
  const value = input[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} wajib diisi.`);
  }
  return value.trim();
}

function optionalString(input: CrudInput, name: string) {
  const value = input[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function boolValue(input: CrudInput, name: string) {
  return input[name] === true || input[name] === "true" || input[name] === "on";
}

function numberValue(input: CrudInput, name: string, fallback = 0) {
  const value = Number(input[name]);
  return Number.isFinite(value) ? value : fallback;
}

function dateValue(input: CrudInput, name: string, label: string) {
  const value = input[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} wajib diisi.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} tidak valid.`);
  }
  return date;
}

async function desaResource(): Promise<ResourceConfig> {
  const fields: FieldDef[] = [
    {
      name: "nama",
      label: "Nama Desa",
      type: "text",
      required: true,
      placeholder: "Contoh: PELITA",
    },
    {
      name: "aktif",
      label: "Status aktif",
      type: "checkbox",
      defaultValue: true,
      help: "Nonaktifkan bila desa tidak lagi digunakan.",
    },
  ];

  return {
    key: "desa",
    label: "Desa",
    singular: "Desa",
    description:
      "Daftar desa sebagai induk kelompok pengajian. Data ini dipakai pada formulir jamaah dan jadwal.",
    columns: [
      { key: "nama", label: "Nama Desa" },
      { key: "jumlahKelompok", label: "Kelompok", type: "number" },
      { key: "jumlahJamaah", label: "Jamaah", type: "number" },
      { key: "aktif", label: "Status", type: "badge" },
    ],
    fields,
    searchKeys: ["nama"],
    list: async (scope) => {
      const where: Record<string, unknown> = {};
      if (scope.kind === "desa") where.id = scope.desaId;
      if (scope.kind === "kelompok") {
        const kelompok = await prisma.kelompok.findMany({
          where: { id: scope.kelompokId ?? "" },
          select: { desaId: true },
        });
        if (kelompok[0]) where.id = kelompok[0].desaId;
      }

      const rows = await prisma.desa.findMany({
        where,
        orderBy: { nama: "asc" },
        include: {
          _count: { select: { kelompok: true, jamaah: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        aktif: row.aktif,
        jumlahKelompok: row._count.kelompok,
        jumlahJamaah: row._count.jamaah,
      }));
    },
    create: async (input, scope) => {
      assertMasterDataWritable(scope, "desa");
      return prisma.desa.create({
        data: {
          nama: requireString(input, "nama", "Nama desa"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    update: async (id, input, scope) => {
      assertMasterDataWritable(scope, "desa");
      return prisma.desa.update({
        where: { id },
        data: {
          nama: requireString(input, "nama", "Nama desa"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    remove: async (id, scope) => {
      assertMasterDataWritable(scope, "desa");
      return prisma.desa.delete({ where: { id } });
    },
  };
}

async function kelompokResource(): Promise<ResourceConfig> {
  const daftarDesa = await prisma.desa.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });

  const fields: FieldDef[] = [
    {
      name: "nama",
      label: "Nama Kelompok",
      type: "text",
      required: true,
      placeholder: "Contoh: BHAKTI",
    },
    {
      name: "desaId",
      label: "Desa",
      type: "select",
      required: true,
      placeholder: "Pilih desa",
      options: daftarDesa.map((desa) => ({ value: desa.id, label: desa.nama })),
    },
    {
      name: "aktif",
      label: "Status aktif",
      type: "checkbox",
      defaultValue: true,
    },
  ];

  return {
    key: "kelompok",
    label: "Kelompok",
    singular: "Kelompok",
    description:
      "Kelompok pengajian di bawah setiap desa. Nama kelompok harus unik dalam satu desa.",
    columns: [
      { key: "nama", label: "Nama Kelompok" },
      { key: "desaNama", label: "Desa" },
      { key: "jumlahJamaah", label: "Jamaah", type: "number" },
      { key: "aktif", label: "Status", type: "badge" },
    ],
    fields,
    searchKeys: ["nama", "desaNama"],
    list: async (scope) => {
      const where: Record<string, unknown> = {};
      if (scope.kind === "desa") where.desaId = scope.desaId;
      if (scope.kind === "kelompok") where.id = scope.kelompokId;

      const rows = await prisma.kelompok.findMany({
        where,
        orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
        include: {
          desa: { select: { nama: true } },
          _count: { select: { jamaah: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        desaId: row.desaId,
        desaNama: row.desa.nama,
        jumlahJamaah: row._count.jamaah,
        aktif: row.aktif,
      }));
    },
    create: async (input, scope) => {
      assertMasterDataWritable(scope, "kelompok");
      return prisma.kelompok.create({
        data: {
          nama: requireString(input, "nama", "Nama kelompok"),
          desaId: requireString(input, "desaId", "Desa"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    update: async (id, input, scope) => {
      assertMasterDataWritable(scope, "kelompok");
      return prisma.kelompok.update({
        where: { id },
        data: {
          nama: requireString(input, "nama", "Nama kelompok"),
          desaId: requireString(input, "desaId", "Desa"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    remove: async (id, scope) => {
      assertMasterDataWritable(scope, "kelompok");
      return prisma.kelompok.delete({ where: { id } });
    },
  };
}

async function kategoriResource(): Promise<ResourceConfig> {
  const fields: FieldDef[] = [
    {
      name: "nama",
      label: "Nama Kategori",
      type: "text",
      required: true,
      placeholder: "Contoh: Bapak",
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea",
      placeholder: "Keterangan singkat kategori",
    },
    {
      name: "urutan",
      label: "Urutan",
      type: "number",
      defaultValue: 0,
      help: "Angka kecil tampil lebih dulu di daftar pilihan.",
    },
    {
      name: "aktif",
      label: "Status aktif",
      type: "checkbox",
      defaultValue: true,
    },
  ];

  return {
    key: "kategori",
    label: "Kategori",
    singular: "Kategori",
    description:
      "Kategori jamaah seperti Bapak, Ibu, atau Pengurus. Urutan memengaruhi tampilan pada formulir.",
    columns: [
      { key: "nama", label: "Nama Kategori" },
      { key: "deskripsi", label: "Deskripsi" },
      { key: "urutan", label: "Urutan", type: "number" },
      { key: "aktif", label: "Status", type: "badge" },
    ],
    fields,
    searchKeys: ["nama", "deskripsi"],
    list: async () => {
      const rows = await prisma.kategori.findMany({
        orderBy: [{ urutan: "asc" }, { nama: "asc" }],
      });
      return rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        deskripsi: row.deskripsi,
        urutan: row.urutan,
        aktif: row.aktif,
      }));
    },
    create: async (input, scope) => {
      assertMasterDataWritable(scope, "kategori");
      return prisma.kategori.create({
        data: {
          nama: requireString(input, "nama", "Nama kategori"),
          deskripsi: optionalString(input, "deskripsi"),
          urutan: numberValue(input, "urutan"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    update: async (id, input, scope) => {
      assertMasterDataWritable(scope, "kategori");
      return prisma.kategori.update({
        where: { id },
        data: {
          nama: requireString(input, "nama", "Nama kategori"),
          deskripsi: optionalString(input, "deskripsi"),
          urutan: numberValue(input, "urutan"),
          aktif: boolValue(input, "aktif"),
        },
      });
    },
    remove: async (id, scope) => {
      assertMasterDataWritable(scope, "kategori");
      return prisma.kategori.delete({ where: { id } });
    },
  };
}

async function jamaahResource(scope: Scope): Promise<ResourceConfig> {
  const [daftarKategori, semuaKelompok] = await Promise.all([
    prisma.kategori.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
      select: { id: true, nama: true },
    }),
    prisma.kelompok.findMany({
      where: { aktif: true },
      orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
      select: { id: true, nama: true, desaId: true, desa: { select: { nama: true } } },
    }),
  ]);

  // Admin Desa / Admin Kelompok hanya boleh memilih kelompok di wilayahnya.
  const daftarKelompok = semuaKelompok.filter((item) => {
    if (scope.kind === "all") return true;
    if (scope.kind === "none") return false;
    if (scope.kind === "kelompok") return item.id === scope.kelompokId;
    return item.desaId === scope.desaId;
  });

  const fields: FieldDef[] = [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      required: true,
      placeholder: "Nama jamaah",
    },
    {
      name: "kategoriId",
      label: "Kategori",
      type: "select",
      required: true,
      placeholder: "Pilih kategori",
      options: daftarKategori.map((item) => ({
        value: item.id,
        label: item.nama,
      })),
    },
    {
      name: "kelompokId",
      label: "Kelompok",
      type: "select",
      required: true,
      placeholder: "Pilih kelompok",
      options: daftarKelompok.map((item) => ({
        value: item.id,
        label: `${item.desa.nama} — ${item.nama}`,
      })),
    },
    {
      name: "noWa",
      label: "Nomor WhatsApp",
      type: "text",
      placeholder: "628xxxxxxxxxx",
    },
    {
      name: "statusAktif",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: "Aktif",
      options: ["Aktif", "Pindah", "Tidak Aktif"].map((status) => ({
        value: status,
        label: status,
      })),
    },
  ];

  return {
    key: "jamaah",
    label: "Jamaah",
    singular: "Jamaah",
    description:
      "Data jamaah beserta kategori dan kelompoknya. Desa ditentukan otomatis dari kelompok yang dipilih.",
    columns: [
      { key: "nama", label: "Nama" },
      { key: "kategoriNama", label: "Kategori" },
      { key: "desaNama", label: "Desa" },
      { key: "kelompokNama", label: "Kelompok" },
      { key: "noWa", label: "No. WhatsApp" },
      { key: "statusAktif", label: "Status", type: "badge" },
    ],
    fields,
    searchKeys: ["nama", "kategoriNama", "desaNama", "kelompokNama", "noWa"],
    list: async (scope) => {
      const rows = await prisma.jamaah.findMany({
        where: scopedWhere(scope),
        orderBy: { nama: "asc" },
        include: {
          kategori: { select: { nama: true } },
          desa: { select: { nama: true } },
          kelompok: { select: { nama: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        kategoriId: row.kategoriId,
        kategoriNama: row.kategori.nama,
        desaId: row.desaId,
        desaNama: row.desa.nama,
        kelompokId: row.kelompokId,
        kelompokNama: row.kelompok.nama,
        noWa: row.noWa,
        statusAktif: row.statusAktif,
      }));
    },
    create: async (input, scope) => {
      const kelompokId = requireString(input, "kelompokId", "Kelompok");
      const kelompok = await prisma.kelompok.findUnique({ where: { id: kelompokId } });
      if (!kelompok) throw new Error("Kelompok tidak ditemukan.");

      assertWithinScope(
        scope,
        { desaId: kelompok.desaId, kelompokId: kelompok.id },
        "jamaah"
      );

      return prisma.jamaah.create({
        data: {
          nama: requireString(input, "nama", "Nama jamaah"),
          kategoriId: requireString(input, "kategoriId", "Kategori"),
          noWa: optionalString(input, "noWa"),
          desaId: kelompok.desaId,
          kelompokId,
          statusAktif: optionalString(input, "statusAktif") ?? "Aktif",
        },
      });
    },
    update: async (id, input, scope) => {
      const existing = await prisma.jamaah.findUnique({
        where: { id },
        select: { id: true, desaId: true, kelompokId: true },
      });
      if (!existing) throw new Error("Jamaah tidak ditemukan.");
      assertWithinScope(scope, existing, "jamaah");

      const kelompokId = requireString(input, "kelompokId", "Kelompok");
      const kelompok = await prisma.kelompok.findUnique({ where: { id: kelompokId } });
      if (!kelompok) throw new Error("Kelompok tidak ditemukan.");

      assertWithinScope(
        scope,
        { desaId: kelompok.desaId, kelompokId: kelompok.id },
        "jamaah"
      );

      return prisma.jamaah.update({
        where: { id },
        data: {
          nama: requireString(input, "nama", "Nama jamaah"),
          kategoriId: requireString(input, "kategoriId", "Kategori"),
          noWa: optionalString(input, "noWa"),
          desaId: kelompok.desaId,
          kelompokId,
          statusAktif: optionalString(input, "statusAktif") ?? "Aktif",
        },
      });
    },
    remove: async (id, scope) => {
      const existing = await prisma.jamaah.findUnique({
        where: { id },
        select: { id: true, desaId: true, kelompokId: true },
      });
      if (!existing) throw new Error("Jamaah tidak ditemukan.");
      assertWithinScope(scope, existing, "jamaah");
      return prisma.jamaah.delete({ where: { id } });
    },
  };
}

/**
 * Resource Jamaah yang dibatasi ke satu kelompok.
 *
 * Dipakai oleh halaman detail kelompok (/admin/kelompok/[kelompokId]) sehingga
 * pengguna bisa melihat, menambah, mengubah, dan menghapus anggota kelompok
 * tersebut tanpa bisa memindahkan anggota ke kelompok lain.
 */
export async function kelompokJamaahResource(
  kelompokId: string,
  scope: Scope
): Promise<ResourceConfig | null> {
  const kelompok = await prisma.kelompok.findUnique({
    where: { id: kelompokId },
    select: {
      id: true,
      nama: true,
      desaId: true,
      desa: { select: { nama: true } },
    },
  });

  if (!kelompok) return null;

  // Kelompok harus berada di dalam cakupan wilayah akun.
  assertWithinScope(
    scope,
    { desaId: kelompok.desaId, kelompokId: kelompok.id },
    "jamaah"
  );

  const daftarKategori = await prisma.kategori.findMany({
    where: { aktif: true },
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
    select: { id: true, nama: true },
  });

  const fields: FieldDef[] = [
    {
      name: "nama",
      label: "Nama Lengkap",
      type: "text",
      required: true,
      placeholder: "Nama jamaah",
    },
    {
      name: "kategoriId",
      label: "Kategori",
      type: "select",
      required: true,
      placeholder: "Pilih kategori",
      options: daftarKategori.map((item) => ({
        value: item.id,
        label: item.nama,
      })),
    },
    {
      name: "noWa",
      label: "Nomor WhatsApp",
      type: "text",
      placeholder: "628xxxxxxxxxx",
    },
    {
      name: "statusAktif",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: "Aktif",
      options: ["Aktif", "Pindah", "Tidak Aktif"].map((status) => ({
        value: status,
        label: status,
      })),
    },
  ];

  const kategoriIds = new Set(daftarKategori.map((item) => item.id));

  const JamaahData = (input: CrudInput) => {
    const kategoriId = requireString(input, "kategoriId", "Kategori");
    if (!kategoriIds.has(kategoriId)) {
      throw new Error("Kategori tidak ditemukan.");
    }

    const statusAktif = optionalString(input, "statusAktif") ?? "Aktif";
    if (!["Aktif", "Pindah", "Tidak Aktif"].includes(statusAktif)) {
      throw new Error("Status tidak valid.");
    }

    return {
      nama: requireString(input, "nama", "Nama jamaah"),
      kategoriId,
      noWa: optionalString(input, "noWa"),
      statusAktif,
    };
  };

  return {
    key: "jamaah",
    label: "Jamaah",
    singular: "Jamaah",
    description: `Daftar jamaah pada kelompok ${kelompok.nama} (${kelompok.desa.nama}).`,
    columns: [
      { key: "nama", label: "Nama" },
      { key: "kategoriNama", label: "Kategori" },
      { key: "noWa", label: "No. WhatsApp" },
      { key: "statusAktif", label: "Status", type: "badge" },
    ],
    fields,
    searchKeys: ["nama", "kategoriNama", "noWa"],
    list: async () => {
      const rows = await prisma.jamaah.findMany({
        where: { kelompokId: kelompok.id },
        orderBy: { nama: "asc" },
        include: { kategori: { select: { nama: true } } },
      });
      return rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        kategoriId: row.kategoriId,
        kategoriNama: row.kategori.nama,
        noWa: row.noWa,
        statusAktif: row.statusAktif,
      }));
    },
    create: async (input) => {
      const data = JamaahData(input);
      return prisma.jamaah.create({
        data: {
          ...data,
          desaId: kelompok.desaId,
          kelompokId: kelompok.id,
        },
      });
    },
    update: async (id, input) => {
      const existing = await prisma.jamaah.findUnique({
        where: { id },
        select: { id: true, kelompokId: true },
      });
      if (!existing) throw new Error("Jamaah tidak ditemukan.");
      if (existing.kelompokId !== kelompok.id) {
        throw new Error("Jamaah ini bukan anggota kelompok tersebut.");
      }

      const data = JamaahData(input);
      return prisma.jamaah.update({
        where: { id },
        data,
      });
    },
    remove: async (id) => {
      const existing = await prisma.jamaah.findUnique({
        where: { id },
        select: { id: true, kelompokId: true },
      });
      if (!existing) throw new Error("Jamaah tidak ditemukan.");
      if (existing.kelompokId !== kelompok.id) {
        throw new Error("Jamaah ini bukan anggota kelompok tersebut.");
      }

      return prisma.jamaah.delete({ where: { id } });
    },
  };
}

async function jadwalResource(scope: Scope): Promise<ResourceConfig> {
  const [daftarDesa, daftarKelompok, daftarKategori] = await Promise.all([
    prisma.desa.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.kelompok.findMany({
      where: { aktif: true },
      orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
      select: { id: true, nama: true, desaId: true, desa: { select: { nama: true } } },
    }),
    prisma.kategori.findMany({
      where: { aktif: true },
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
      select: { id: true, nama: true },
    }),
  ]);

  const desaMap = new Map(daftarDesa.map((desa) => [desa.id, desa]));
  const kelompokMap = new Map(daftarKelompok.map((item) => [item.id, item]));

  const fields: FieldDef[] = [
    {
      name: "tanggal",
      label: "Tanggal",
      type: "date",
      required: true,
    },
    {
      name: "jenisPengajian",
      label: "Jenis Pengajian",
      type: "text",
      required: true,
      placeholder: "Contoh: Pengajian Rutin",
    },
    {
      name: "jamMulai",
      label: "Jam Mulai",
      type: "time",
      required: true,
    },
    {
      name: "jamSelesai",
      label: "Jam Selesai",
      type: "time",
      required: true,
    },
    {
      name: "tingkat",
      label: "Tingkat",
      type: "select",
      required: true,
      defaultValue: "Kelompok",
      options: ["Daerah", "Desa", "Kelompok"].map((tingkat) => ({
        value: tingkat,
        label: tingkat,
      })),
    },
    {
      name: "kategoriIds",
      label: "Kategori Jamaah",
      type: "select",
      required: true,
      defaultValue: [],
      multiSelect: true,
      options: daftarKategori.map((kat) => ({ value: kat.id, label: kat.nama })),
      help: "Pilih kategori jamaah yang boleh mengikuti pengajian ini (Bapak, Ibu, dll).",
    },
    {
      name: "desaIds",
      label: "Desa",
      type: "select",
      placeholder: "Pilih desa",
      multiSelect: true,
      options: daftarDesa.map((desa) => ({ value: desa.id, label: desa.nama })),
      help: "Hanya untuk tingkat Desa. Kosongkan jika tingkat Daerah atau Kelompok.",
    },
    {
      name: "kelompokIds",
      label: "Kelompok",
      type: "select",
      placeholder: "Pilih kelompok",
      multiSelect: true,
      options: daftarKelompok.map((item) => ({
        value: item.id,
        label: `${item.desa.nama} — ${item.nama}`,
      })),
      help: "Pilih satu atau lebih kelompok.",
    },
    {
      name: "statusBuka",
      label: "Status Presensi",
      type: "select",
      required: true,
      defaultValue: "Tutup",
      options: ["Buka", "Tutup"].map((status) => ({
        value: status,
        label: status,
      })),
    },
  ];

  return {
    key: "jadwal",
    label: "Jadwal",
    singular: "Jadwal",
    description:
      "Jadwal pengajian pada tingkat daerah, desa, atau kelompok. Buka status presensi agar jamaah dapat dicatat.",
    columns: [
      { key: "tanggal", label: "Tanggal", type: "date" },
      { key: "jenisPengajian", label: "Jenis Pengajian" },
      { key: "waktu", label: "Waktu" },
      { key: "tingkat", label: "Tingkat", type: "badge" },
      { key: "lokasi", label: "Lokasi" },
      { key: "statusBuka", label: "Presensi", type: "badge" },
    ],
    fields,
    searchKeys: ["jenisPengajian", "tingkat", "lokasi"],
    list: async () => {
      const rows = await prisma.jadwal.findMany({
        orderBy: { tanggal: "desc" },
      });
      const maps: ScopeMaps = {
        kelompokToDesa: new Map(
          daftarKelompok
            .filter((item) => item.desaId)
            .map((item) => [item.id, item.desaId] as const)
        ),
      };

      return rows
        .filter((row) =>
          jadwalVisible(
            scope,
            {
              tingkat: row.tingkat,
              desaIds: row.desaIds ?? [],
              kelompokIds: row.kelompokIds ?? [],
            },
            maps
          )
        )
        .map((row) => {
          const lokasiNama =
            row.kelompokIds?.length
              ? row.kelompokIds
                  .map((id) => kelompokMap.get(id)?.nama)
                  .filter(Boolean)
                  .join(", ")
              : row.desaIds?.length
                ? row.desaIds.map((id) => desaMap.get(id)?.nama).filter(Boolean).join(", ")
                : "Daerah";
          return {
            id: row.id,
            tanggal: isoDate(row.tanggal),
            jenisPengajian: row.jenisPengajian,
            jamMulai: row.jamMulai,
            jamSelesai: row.jamSelesai,
            waktu: `${row.jamMulai} - ${row.jamSelesai}`,
            tingkat: row.tingkat,
            desaIds: row.desaIds ?? [],
            kelompokIds: row.kelompokIds ?? [],
            kategoriIds: row.kategoriIds ?? [],
            lokasi: lokasiNama,
            statusBuka: row.statusBuka,
          };
        });
    },
    create: async (input, scope) => {
      assertMasterDataWritable(scope, "jadwal");
      return prisma.jadwal.create({
        data: {
          tanggal: dateValue(input, "tanggal", "Tanggal"),
          jenisPengajian: requireString(input, "jenisPengajian", "Jenis pengajian"),
          jamMulai: requireString(input, "jamMulai", "Jam mulai"),
          jamSelesai: requireString(input, "jamSelesai", "Jam selesai"),
          tingkat: requireString(input, "tingkat", "Tingkat"),
          desaIds: Array.isArray(input.desaIds) ? input.desaIds : [],
          kelompokIds: Array.isArray(input.kelompokIds) ? input.kelompokIds : [],
          kategoriIds: Array.isArray(input.kategoriIds) ? input.kategoriIds : [],
          statusBuka: optionalString(input, "statusBuka") ?? "Tutup",
        },
      });
    },
    update: async (id, input, scope) => {
      assertMasterDataWritable(scope, "jadwal");
      return prisma.jadwal.update({
        where: { id },
        data: {
          tanggal: dateValue(input, "tanggal", "Tanggal"),
          jenisPengajian: requireString(input, "jenisPengajian", "Jenis pengajian"),
          jamMulai: requireString(input, "jamMulai", "Jam mulai"),
          jamSelesai: requireString(input, "jamSelesai", "Jam selesai"),
          tingkat: requireString(input, "tingkat", "Tingkat"),
          desaIds: Array.isArray(input.desaIds) ? input.desaIds : [],
          kelompokIds: Array.isArray(input.kelompokIds) ? input.kelompokIds : [],
          kategoriIds: Array.isArray(input.kategoriIds) ? input.kategoriIds : [],
          statusBuka: optionalString(input, "statusBuka") ?? "Tutup",
        },
      });
    },
    remove: async (id, scope) => {
      assertMasterDataWritable(scope, "jadwal");
      return prisma.jadwal.delete({ where: { id } });
    },
  };
}

async function presensiResource(scope: Scope): Promise<ResourceConfig> {
  const [daftarJadwal, semuaJamaah] = await Promise.all([
    prisma.jadwal.findMany({
      orderBy: { tanggal: "desc" },
      select: {
        id: true,
        tanggal: true,
        jenisPengajian: true,
        jamMulai: true,
        tingkat: true,
        desaIds: true,
        kelompokIds: true,
      },
    }),
    prisma.jamaah.findMany({
      orderBy: { nama: "asc" },
      select: {
        id: true,
        nama: true,
        desaId: true,
        kelompokId: true,
        desa: { select: { nama: true } },
        kelompok: { select: { nama: true } },
      },
    }),
  ]);

  const daftarJamaah = semuaJamaah.filter((j) => {
    if (scope.kind === "all") return true;
    if (scope.kind === "none") return false;
    if (scope.kind === "kelompok") return j.kelompokId === scope.kelompokId;
    return j.desaId === scope.desaId;
  });

  const fields: FieldDef[] = [
    {
      name: "jadwalId",
      label: "Jadwal",
      type: "select",
      required: true,
      placeholder: "Pilih jadwal",
      options: daftarJadwal.map((jadwal) => ({
        value: jadwal.id,
        label: `${isoDate(jadwal.tanggal)} • ${jadwal.jenisPengajian} (${jadwal.tingkat})`,
      })),
    },
    {
      name: "jamaahId",
      label: "Jamaah",
      type: "select",
      required: true,
      placeholder: "Pilih jamaah",
      options: daftarJamaah.map((jamaah) => ({
        value: jamaah.id,
        label: `${jamaah.nama} — ${jamaah.desa.nama}/${jamaah.kelompok.nama}`,
      })),
    },
    {
      name: "status",
      label: "Status Kehadiran",
      type: "select",
      required: true,
      defaultValue: "Hadir",
      options: ["Hadir", "Izin", "Sakit"].map((status) => ({
        value: status,
        label: status,
      })),
    },
    {
      name: "keterangan",
      label: "Keterangan",
      type: "textarea",
      placeholder: "Catatan tambahan (opsional)",
    },
  ];

  return {
    key: "presensi",
    label: "Presensi",
    singular: "Presensi",
    description:
      "Catatan kehadiran jamaah pada setiap jadwal pengajian. Data kategori, desa, dan kelompok mengikuti jamaah yang dipilih.",
    columns: [
      { key: "namaJamaah", label: "Nama Jamaah" },
      { key: "jadwalLabel", label: "Jadwal" },
      { key: "kategoriNama", label: "Kategori" },
      { key: "status", label: "Kehadiran", type: "badge" },
      { key: "keterangan", label: "Keterangan" },
    ],
    fields,
    searchKeys: ["namaJamaah", "jadwalLabel", "kategoriNama", "status"],
    list: async (scope) => {
      const rows = await prisma.presensi.findMany({
        where: scopedWhere(scope),
        orderBy: { createdAt: "desc" },
        include: {
          jadwal: { select: { tanggal: true, jenisPengajian: true } },
          kategori: { select: { nama: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        jadwalId: row.jadwalId,
        jamaahId: row.jamaahId,
        namaJamaah: row.namaJamaah,
        jadwalLabel: `${isoDate(row.jadwal.tanggal)} • ${row.jadwal.jenisPengajian}`,
        kategoriNama: row.kategori.nama,
        status: row.status,
        keterangan: row.keterangan,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    create: async (input, scope) => {
      const jadwalId = requireString(input, "jadwalId", "Jadwal");
      const jamaahId = requireString(input, "jamaahId", "Jamaah");
      const jamaah = await prisma.jamaah.findUnique({ where: { id: jamaahId } });
      if (!jamaah) throw new Error("Jamaah tidak ditemukan.");
      assertWithinScope(scope, jamaah, "presensi");

      return prisma.presensi.create({
        data: {
          jadwalId,
          jamaahId,
          namaJamaah: jamaah.nama,
          kategoriId: jamaah.kategoriId,
          desaId: jamaah.desaId,
          kelompokId: jamaah.kelompokId,
          status: requireString(input, "status", "Status kehadiran"),
          keterangan: optionalString(input, "keterangan"),
        },
      });
    },
    update: async (id, input, scope) => {
      const existing = await prisma.presensi.findUnique({
        where: { id },
        select: { id: true, desaId: true, kelompokId: true },
      });
      if (!existing) throw new Error("Data presensi tidak ditemukan.");
      assertWithinScope(scope, existing, "presensi");

      const jadwalId = requireString(input, "jadwalId", "Jadwal");
      const jamaahId = requireString(input, "jamaahId", "Jamaah");
      const jamaah = await prisma.jamaah.findUnique({ where: { id: jamaahId } });
      if (!jamaah) throw new Error("Jamaah tidak ditemukan.");
      assertWithinScope(scope, jamaah, "presensi");

      return prisma.presensi.update({
        where: { id },
        data: {
          jadwalId,
          jamaahId,
          namaJamaah: jamaah.nama,
          kategoriId: jamaah.kategoriId,
          desaId: jamaah.desaId,
          kelompokId: jamaah.kelompokId,
          status: requireString(input, "status", "Status kehadiran"),
          keterangan: optionalString(input, "keterangan"),
        },
      });
    },
    remove: async (id, scope) => {
      const existing = await prisma.presensi.findUnique({
        where: { id },
        select: { id: true, desaId: true, kelompokId: true },
      });
      if (!existing) throw new Error("Data presensi tidak ditemukan.");
      assertWithinScope(scope, existing, "presensi");
      return prisma.presensi.delete({ where: { id } });
    },
  };
}

async function penggunaResource(scope: Scope): Promise<ResourceConfig> {
  const [roleDefinitions, daftarDesa, daftarKelompok] = await Promise.all([
    getAllRoleDefinitions(),
    prisma.desa.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.kelompok.findMany({
      orderBy: [{ desa: { nama: "asc" } }, { nama: "asc" }],
      select: { id: true, nama: true, desaId: true, desa: { select: { nama: true } } },
    }),
  ]);

  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Nama Lengkap",
      type: "text",
      required: true,
      placeholder: "Nama pengurus",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      placeholder: "nama@jambikota1.local",
      help: "Email dipakai sebagai username saat login.",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Minimal 6 karakter",
      help: "Saat mengedit, kosongkan bila password tidak diubah.",
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      defaultValue: "Admin_CAI",
      options: roleDefinitions.map((role) => ({
        value: role.value,
        label: role.label,
      })),
    },
    {
      name: "desaId",
      label: "Desa",
      type: "select",
      placeholder: "Pilih desa",
      options: daftarDesa.map((desa) => ({ value: desa.id, label: desa.nama })),
      visibleWhen: { field: "role", notEquals: ["Super_Admin", "Admin_CAI"] },
      help: "Wajib untuk role Desa. Menentukan cakupan data yang bisa diakses akun.",
    },
    {
      name: "kelompokId",
      label: "Kelompok",
      type: "select",
      placeholder: "Pilih kelompok",
      options: daftarKelompok.map((item) => ({
        value: item.id,
        label: `${item.desa.nama} — ${item.nama}`,
      })),
      visibleWhen: { field: "role", notEquals: ["Super_Admin", "Admin_CAI"] },
      help: "Wajib untuk role Kelompok. Menentukan cakupan data yang bisa diakses akun.",
    },
  ];

  const targetOf = async (input: CrudInput) => {
    const role = requireString(input, "role", "Role");
    if (role === "Super_Admin" || role === "Admin_CAI") {
      return { role, desaId: null, kelompokId: null };
    }

    const kelompokId = optionalString(input, "kelompokId");
    const desaId = optionalString(input, "desaId");

    if (role === "Desa" && !desaId) {
      throw new Error("Desa wajib dipilih untuk role Desa.");
    }
    if (role === "Kelompok" && !kelompokId) {
      throw new Error("Kelompok wajib dipilih untuk role Kelompok.");
    }
    if (!desaId && !kelompokId) {
      throw new Error(
        "Pilih Desa atau Kelompok agar cakupan data akun ini terbatas pada wilayah tersebut."
      );
    }

    // Bila kelompok dipilih, desa diambil dari kelompok tersebut agar konsisten.
    if (kelompokId) {
      const kelompok = await prisma.kelompok.findUnique({
        where: { id: kelompokId },
        select: { desaId: true },
      });
      if (!kelompok) throw new Error("Kelompok tidak ditemukan.");
      return { role, desaId: kelompok.desaId, kelompokId };
    }

    return { role, desaId, kelompokId: null };
  };

  return {
    key: "pengguna",
    label: "Pengguna",
    singular: "Pengguna",
    description:
      "Akun pengurus yang dapat mengakses sistem. Gunakan role sesuai tingkat kewenangannya.",
    columns: [
      { key: "name", label: "Nama" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role", type: "badge" },
      { key: "wilayah", label: "Wilayah" },
      { key: "createdAt", label: "Dibuat", type: "date" },
    ],
    fields,
    searchKeys: ["name", "email", "role", "wilayah"],
    list: async () => {
      const rows = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          desaId: true,
          kelompokId: true,
          createdAt: true,
        },
      });
      const desaNama = new Map(daftarDesa.map((d) => [d.id, d.nama]));
      const kelompokNama = new Map(daftarKelompok.map((k) => [k.id, k.nama]));

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        desaId: row.desaId,
        kelompokId: row.kelompokId,
        wilayah:
          (row.kelompokId ? kelompokNama.get(row.kelompokId) : undefined) ??
          (row.desaId ? desaNama.get(row.desaId) : undefined) ??
          "Seluruh wilayah",
        createdAt: row.createdAt.toISOString(),
      }));
    },
    create: async (input) => {
      assertMasterDataWritable(scope, "pengguna");

      const email = requireString(input, "email", "Email").toLowerCase();
      const password = requireString(input, "password", "Password");
      if (password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error("Email sudah digunakan oleh akun lain.");

      const target = await targetOf(input);

      return prisma.user.create({
        data: {
          name: requireString(input, "name", "Nama"),
          email,
          password: await bcrypt.hash(password, 12),
          role: target.role,
          desaId: target.desaId,
          kelompokId: target.kelompokId,
        },
      });
    },
    update: async (id, input) => {
      assertMasterDataWritable(scope, "pengguna");

      const email = requireString(input, "email", "Email").toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        throw new Error("Email sudah digunakan oleh akun lain.");
      }

      const password = optionalString(input, "password");
      if (password && password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }

      const target = await targetOf(input);

      return prisma.user.update({
        where: { id },
        data: {
          name: requireString(input, "name", "Nama"),
          email,
          role: target.role,
          desaId: target.desaId,
          kelompokId: target.kelompokId,
          ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
        },
      });
    },
    remove: async (id) => {
      assertMasterDataWritable(scope, "pengguna");
      return prisma.user.delete({ where: { id } });
    },
  };
}

export async function getResource(
  key: string,
  scope: Scope
): Promise<ResourceConfig | null> {
  switch (key) {
    case "desa":
      return desaResource();
    case "kelompok":
      return kelompokResource();
    case "kategori":
      return kategoriResource();
    case "jamaah":
      return jamaahResource(scope);
    case "jadwal":
      return jadwalResource(scope);
    case "presensi":
      return presensiResource(scope);
    case "pengguna":
      return penggunaResource(scope);
    default:
      return null;
  }
}

export const RESOURCE_KEYS = [
  "desa",
  "kelompok",
  "kategori",
  "jamaah",
  "jadwal",
  "presensi",
  "pengguna",
];
