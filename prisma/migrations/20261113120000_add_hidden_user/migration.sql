-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- Sembunyikan akun administrator sistem (Super_Admin bawaan seed) dari daftar Pengguna.
UPDATE "User" SET "hidden" = true WHERE "email" = 'admin@jambikota1.local';
