import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DAFTAR_KATEGORI = [
  { nama: "Pengurus Daerah", deskripsi: "Pengurus tingkat daerah", urutan: 1 },
  { nama: "Pengurus Desa", deskripsi: "Pengurus tingkat desa", urutan: 2 },
  { nama: "Pengurus Kelompok", deskripsi: "Pengurus tingkat kelompok", urutan: 3 },
  { nama: "Pengurus", deskripsi: "Pengurus (umum)", urutan: 4 },
  { nama: "Bapak", deskripsi: "Jamaah laki-laki dewasa", urutan: 5 },
  { nama: "Ibu", deskripsi: "Jamaah perempuan dewasa", urutan: 6 },
  { nama: "Remaja Putra", deskripsi: "Jamaah remaja laki-laki", urutan: 7 },
  { nama: "Remaja Putri", deskripsi: "Jamaah remaja perempuan", urutan: 8 },
];

async function main() {
  console.log("🌱 Mulai seed kategori...\n");

  let dibuat = 0;
  let dilewati = 0;

  for (const item of DAFTAR_KATEGORI) {
    // upsert = insert kalau belum ada, update kalau sudah ada
    const existing = await prisma.kategori.findUnique({
      where: { nama: item.nama },
    });

    if (existing) {
      // Sudah ada — update deskripsi & urutan (kalau berubah)
      await prisma.kategori.update({
        where: { nama: item.nama },
        data: {
          deskripsi: item.deskripsi,
          urutan: item.urutan,
        },
      });
      console.log(`⏭️  Dilewati (sudah ada): ${item.nama}`);
      dilewati++;
    } else {
      // Belum ada — buat baru
      await prisma.kategori.create({
        data: {
          nama: item.nama,
          deskripsi: item.deskripsi,
          urutan: item.urutan,
          aktif: true,
        },
      });
      console.log(`✅ Dibuat: ${item.nama}`);
      dibuat++;
    }
  }

  console.log("\n============================================");
  console.log(`✅ Selesai!`);
  console.log(`   Dibuat   : ${dibuat}`);
  console.log(`   Dilewati : ${dilewati}`);
  console.log(`   Total    : ${DAFTAR_KATEGORI.length}`);
  console.log("============================================");

  // Tampilkan semua kategori yang ada di database
  const semua = await prisma.kategori.findMany({
    orderBy: { urutan: "asc" },
  });

  console.log("\n📋 Kategori di database:");
  console.table(
    semua.map((k) => ({
      ID: k.id.substring(0, 8) + "...",
      Nama: k.nama,
      Urutan: k.urutan,
      Aktif: k.aktif,
    }))
  );
}

main()
  .catch((e) => {
    console.error("❌ Gagal seed kategori:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });