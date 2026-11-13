import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@jambikota1.local"; // ganti sesuai keinginan
  const password = "GantiPasswordKuat123!"; // GANTI dengan password kuat!

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("User sudah ada:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: "Administrator",
      password: hashed,
      role: "Super_Admin",
      // Akun administrator sistem tidak ditampilkan di daftar Pengguna.
      hidden: true,
    },
  });

  console.log("✅ User admin dibuat:");
  console.log("   Email:", email);
  console.log("   Password:", password);
  console.log("   Role: Super_Admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());