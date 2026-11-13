/**
 * Ubah error Prisma / Error biasa menjadi pesan yang aman ditampilkan ke user.
 * Dipakai bersama oleh route handler agar pesannya konsisten.
 */
export function toErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    switch ((error as { code?: string }).code) {
      case "P2002":
        return "Data dengan nilai tersebut sudah ada. Periksa kembali nama atau email.";
      case "P2003":
        return "Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.";
      case "P2025":
        return "Data tidak ditemukan.";
    }
  }

  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan pada server.";
}
