import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
} from "../lib/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Mulai seed hak akses role...\n");

  for (const role of ROLES) {
    const permissions = role.locked
      ? [...ALL_PERMISSION_KEYS]
      : DEFAULT_ROLE_PERMISSIONS[role.value] ?? [];

    const existing = await prisma.role.findUnique({
      where: { name: role.value },
    });

    if (existing) {
      console.log(`Dilewati (sudah ada): ${role.label}`);
      continue;
    }

    await prisma.role.create({
      data: { name: role.value, permissions },
    });

    console.log(`Dibuat: ${role.label} (${permissions.length} permission)`);
  }

  const semua = await prisma.role.findMany({ orderBy: { name: "asc" } });
  console.log("\nRole di database:");
  console.table(
    semua.map((role) => ({
      Role: role.name,
      Permission: role.permissions.length,
    }))
  );
}

main()
  .catch((error) => {
    console.error("Gagal seed hak akses:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
