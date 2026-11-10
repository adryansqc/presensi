import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (record.count >= 5) return false;
  record.count++;
  return true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const { jamaahId, status, keterangan } = body;

    // Validasi status hanya Izin atau Sakit
    if (!["Izin", "Sakit"].includes(status)) {
      return NextResponse.json({ error: "Hanya izin atau sakit yang dapat diisi melalui link publik." }, { status: 400 });
    }

    if (!jamaahId) {
      return NextResponse.json({ error: "Jamaah tidak ditentukan." }, { status: 400 });
    }

    // Cari jadwal berdasarkan slug publik
    const jadwal = await prisma.jadwal.findFirst({
      where: { slugPublik: slug, linkPublikAktif: true },
    });

    if (!jadwal) {
      return NextResponse.json({ error: "Link absensi tidak valid atau tidak aktif." }, { status: 404 });
    }

    // Jadwal harus buka
    if (jadwal.statusBuka !== "Buka") {
      return NextResponse.json({ error: "Sesi absensi sudah ditutup." }, { status: 400 });
    }

    // Jamaah harus ada di database
    const jamaah = await prisma.jamaah.findUnique({ where: { id: jamaahId } });
    if (!jamaah) {
      return NextResponse.json({ error: "Jamaah tidak ditemukan." }, { status: 404 });
    }

    // Satu jamaah satu absensi per jadwal
    const existing = await prisma.presensi.findFirst({ where: { jadwalId: jadwal.id, jamaahId } });
    if (existing) {
      return NextResponse.json({ error: "Anda sudah tercatat hadir/izin/sakit pada acara ini." }, { status: 400 });
    }

    // Insert presensi dengan sumber PUBLIK
    const presensi = await prisma.presensi.create({
      data: {
        jadwalId: jadwal.id,
        jamaahId: jamaah.id,
        namaJamaah: jamaah.nama,
        kategoriId: jamaah.kategoriId,
        desaId: jamaah.desaId,
        kelompokId: jamaah.kelompokId,
        status,
        keterangan: keterangan || null,
        sumber: "PUBLIK",
        dicatatOleh: null,
        lintasKelompok: false,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Terima kasih, ${status.toLowerCase()} Anda telah tercatat.`,
      presensi: {
        id: presensi.id,
        nama: presensi.namaJamaah,
        status: presensi.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim absensi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
