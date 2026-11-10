-- AlterTable
ALTER TABLE "User" ADD COLUMN     "desaId" TEXT,
ADD COLUMN     "kelompokId" TEXT;

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desa" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Desa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelompok" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kelompok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jamaah" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "noWa" TEXT,
    "desaId" TEXT NOT NULL,
    "kelompokId" TEXT NOT NULL,
    "statusAktif" TEXT NOT NULL DEFAULT 'Aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jamaah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenisPengajian" TEXT NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "tingkat" TEXT NOT NULL,
    "desaId" TEXT,
    "kelompokId" TEXT,
    "statusBuka" TEXT NOT NULL DEFAULT 'Tutup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presensi" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "jamaahId" TEXT,
    "namaJamaah" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "kelompokId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kategori_nama_key" ON "Kategori"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Desa_nama_key" ON "Desa"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Kelompok_nama_desaId_key" ON "Kelompok"("nama", "desaId");

-- CreateIndex
CREATE INDEX "Jamaah_nama_idx" ON "Jamaah"("nama");

-- CreateIndex
CREATE INDEX "Jamaah_kelompokId_idx" ON "Jamaah"("kelompokId");

-- CreateIndex
CREATE INDEX "Jamaah_desaId_idx" ON "Jamaah"("desaId");

-- CreateIndex
CREATE INDEX "Jadwal_tanggal_idx" ON "Jadwal"("tanggal");

-- CreateIndex
CREATE INDEX "Jadwal_statusBuka_idx" ON "Jadwal"("statusBuka");

-- CreateIndex
CREATE INDEX "Presensi_jadwalId_idx" ON "Presensi"("jadwalId");

-- CreateIndex
CREATE INDEX "Presensi_jamaahId_idx" ON "Presensi"("jamaahId");

-- CreateIndex
CREATE INDEX "Presensi_createdAt_idx" ON "Presensi"("createdAt");

-- AddForeignKey
ALTER TABLE "Kelompok" ADD CONSTRAINT "Kelompok_desaId_fkey" FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jamaah" ADD CONSTRAINT "Jamaah_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jamaah" ADD CONSTRAINT "Jamaah_desaId_fkey" FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jamaah" ADD CONSTRAINT "Jamaah_kelompokId_fkey" FOREIGN KEY ("kelompokId") REFERENCES "Kelompok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "Jadwal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_jamaahId_fkey" FOREIGN KEY ("jamaahId") REFERENCES "Jamaah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
