import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ============================================
// DAFTAR DESA & KELOMPOK
// ============================================
// Format: { desa: "NAMA DESA", kelompok: ["KLP1", "KLP2", ...] }
// ============================================

const DAFTAR_DESA_KELOMPOK = [
  {
    desa: "PELITA",
    kelompok: ["PELITA", "BHAKTI", "TANJUNG SARI", "BUDIMAN", "PAYO SELINCAH", "JERAMBAH BOLONG", "PAHLAWAN"],
  },
  {
    desa: "KOTA BARU",
    kelompok: ["KENALI", "PAGAR DRUM", "SEBAPO", "SIMPANG KAWAT", "MUHAJIR"],
  },
  {
    desa: "PASIR PUTIH",
    kelompok: ["SUMBER REJO", "SUBUR BAROKAH", "CANDRA 1", "CANDRA 2", "TAWAKAL", "PETALING 1", "PETALING 4"],
  },
  {
    desa: "TELANAI PURA",
    kelompok: ["Baitul Baqi", "Manshurin", "Pemancar", "Pijoan", "Sekernan"],
  },
  {
    desa: "PURWODADI",
    kelompok: ["PURWODADI", "STU", "DELIMA", "SP 2 & 9", "TEBING TINGGI"],
  },
  {
    desa: "KUALA TUNGKAL",
    kelompok: ["Kuala Tungkal 1", "Kuala Tungkal 2", "Teluk Sialang", "Simpang abadi"],
  },
];

async function main() {
  console.log("🌱 Mulai seed desa & kelompok...\n");

  let desaDibuat = 0;
  let desaDilewati = 0;
  let kelompokDibuat = 0;
  let kelompokDilewati = 0;

  for (const item of DAFTAR_DESA_KELOMPOK) {
    // ============================================
    // 1. Buat/ambil desa
    // ============================================
    let desa = await prisma.desa.findUnique({
      where: { nama: item.desa },
    });

    if (!desa) {
      desa = await prisma.desa.create({
        data: { nama: item.desa, aktif: true },
      });
      console.log(`✅ Desa dibuat: ${item.desa}`);
      desaDibuat++;
    } else {
      console.log(`⏭️  Desa dilewati (sudah ada): ${item.desa}`);
      desaDilewati++;
    }

    // ============================================
    // 2. Buat kelompok di bawah desa ini
    // ============================================
    for (const namaKelompok of item.kelompok) {
      const existing = await prisma.kelompok.findUnique({
        where: {
          nama_desaId: {
            nama: namaKelompok,
            desaId: desa.id,
          },
        },
      });

      if (existing) {
        console.log(`   ⏭️  Kelompok dilewati: ${namaKelompok} (${item.desa})`);
        kelompokDilewati++;
      } else {
        await prisma.kelompok.create({
          data: {
            nama: namaKelompok,
            desaId: desa.id,
            aktif: true,
          },
        });
        console.log(`   ✅ Kelompok dibuat: ${namaKelompok} (${item.desa})`);
        kelompokDibuat++;
      }
    }
    console.log("");
  }

  // ============================================
  // RINGKASAN
  // ============================================
  console.log("============================================");
  console.log("✅ Selesai!");
  console.log(`   Desa dibuat   : ${desaDibuat}`);
  console.log(`   Desa dilewati : ${desaDilewati}`);
  console.log(`   Kelompok dibuat   : ${kelompokDibuat}`);
  console.log(`   Kelompok dilewati : ${kelompokDilewati}`);
  console.log("============================================");

  // ============================================
  // TAMPILKAN HASIL
  // ============================================
  const semuaDesa = await prisma.desa.findMany({
    orderBy: { nama: "asc" },
    include: {
      kelompok: { orderBy: { nama: "asc" } },
    },
  });

  console.log("\n📋 Data Desa & Kelompok di database:\n");
  for (const d of semuaDesa) {
    console.log(`🏛️  ${d.nama} (${d.kelompok.length} kelompok)`);
    for (const k of d.kelompok) {
      console.log(`     └─ ${k.nama}`);
    }
    console.log("");
  }

  const totalDesa = await prisma.desa.count();
  const totalKelompok = await prisma.kelompok.count();
  console.log(`📊 Total: ${totalDesa} desa, ${totalKelompok} kelompok`);
}

main()
  .catch((e) => {
    console.error("❌ Gagal seed desa & kelompok:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });