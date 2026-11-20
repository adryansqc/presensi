import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const jadwal = await prisma.jadwal.findMany({
    where: {
      slugPublik: { not: null },
      linkPublikAktif: true,
    },
    select: { slugPublik: true, updatedAt: true },
  });

  const absenRoutes: MetadataRoute.Sitemap = jadwal.map((j) => ({
    url: `${siteUrl}/absen/${j.slugPublik}`,
    lastModified: j.updatedAt ?? new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...absenRoutes];
}
