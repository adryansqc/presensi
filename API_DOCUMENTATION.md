# 📘 API Dokumentasi — Sistem Absensi Presensi Jambi Kota 1

Dokumen ini adalah single source of truth untuk semua endpoint API sistem absensi.

---

## 🔐 Autentikasi & Otorisasi

Semua endpoint di bawah `/api/admin/**` memerlukan sesi login yang valid melalui NextAuth (`next-auth`).

| Helper | Keterangan |
|--------|------------|
| `requireAuth()` | Memeriksa sesi login |
| `requireRole([...])` | Memeriksa role user (Super_Admin, Admin_CAI, Desa, Kelompok) |
| `requirePermission("xxx")` | Memeriksa permission spesifik (misal `jadwal.view`, `presensi.create`) |

Endpoint di bawah `/api/public/**` dan `/api/absen/**` **tidak memerlukan login** (publik).

---

## 📅 Jadwal

### `GET /api/admin/jadwal`
Mendaftar jadwal pengajian.

- **Auth:** Diperlukan (`jadwal.view`)
- **Filter cakupan:** Pengurus Desa hanya melihat jadwal desa; Pengurus Kelompok hanya kelompoknya.
- **Response:**
```json
[
  {
    "id": "cjd...",
    "tanggal": "2026-11-15T00:00:00.000Z",
    "jenisPengajian": "Pengajian Rutin",
    "jamMulai": "19:00",
    "jamSelesai": "21:00",
    "tingkat": "Desa",
    "desaId": "cjd_...",
    "kelompokId": null,
    "statusBuka": "Tutup",
    "slugPublik": null,
    "linkPublikAktif": false,
    "dibuatOleh": "cjd_...",
    "dibuatOlehUser": { "name": "Budi", "email": "budi@example.com" },
    "createdAt": "...",
    "updatedAt": "...",
    "presensi": [...]
  }
]
```

---

### `POST /api/admin/jadwal`
Membuat jadwal baru. Selalu dibuat dengan status `"Tutup"`.

- **Auth:** Diperlukan (`jadwal.create`)
- **Batas cakupan:** jadwal wajib berada di dalam wilayah akun. Scope "kelompok" hanya boleh membuat jadwal untuk kelompoknya, scope "desa" hanya untuk desanya, jadwal tingkat `Daerah` (tanpa desa/kelompok) hanya untuk Super Admin/Admin CAI.
- **Body:**
```json
{
  "tanggal": "2026-11-15",
  "jenisPengajian": "Pengajian Rutin",
  "jamMulai": "19:00",
  "jamSelesai": "21:00",
  "tingkat": "Desa",
  "desaId": "cjd_...",
  "kelompokId": null
}
```
- **Response (201):**
```json
{ "ok": true, "jadwal": { ... } }
```

---

### `PUT /api/admin/jadwal/[id]`
Mengupdate jadwal.

- **Auth:** Diperlukan (`jadwal.edit`)
- **Batas cakupan:** jadwal yang ada (dan nilai baru) harus berada di dalam wilayah akun.
- **Body:** Field yang sama dengan POST (parsial diizinkan)

---

### `DELETE /api/admin/jadwal/[id]`
Menghapus jadwal.

- **Auth:** Diperlukan (`jadwal.delete`)
- **Batas cakupan:** jadwal harus berada di dalam wilayah akun.

---

### `POST /api/admin/jadwal/[id]/buka`
Membuka sesi absensi. Sistem otomatis menutup semua jadwal lain yang masih `"Buka"` — hanya satu jadwal yang boleh buka pada satu waktu.

- **Auth:** Diperlukan (`jadwal.edit`)
- **Batas cakupan:** hanya jadwal di dalam wilayah akun yang boleh dibuka. Jadwal tingkat `Daerah` hanya untuk Super Admin/Admin CAI.
- **Response (200):**
```json
{ "ok": true, "jadwal": { ... } }
```

---

### `POST /api/admin/jadwal/[id]/tutup`
Menutup sesi absensi. Setelah ditutup, data absensi terkunci dan tidak dapat diubah.

- **Auth:** Diperlukan (`jadwal.edit`)
- **Batas cakupan:** hanya jadwal di dalam wilayah akun yang boleh ditutup.

---

### `POST /api/admin/jadwal/[id]/bagikan`
Generate link publik untuk absensi mandiri jamaah.

- **Auth:** Diperlukan (`jadwal.edit`)
- **Batas cakupan:** hanya jadwal di dalam wilayah akun yang boleh dibuatkan link publik.
- **Prasyarat:** Jadwal harus berstatus `"Buka"`
- **Response (200):**
```json
{
  "ok": true,
  "slug": "aB3xK9mP",
  "link": "https://domain.com/absen/aB3xK9mP",
  "jadwal": { ... }
}
```

---

## ✍️ Presensi (Pengurus)

### `GET /api/admin/presensi?jadwalId=...`
Mendaftar data presensi pada jadwal tertentu.

- **Auth:** Diperlukan (`presensi.view`)
- **Filter:** Desa/Kelompok sesuai cakupan user.

---

### `POST /api/admin/presensi`
Menyimpan/mengupdate absensi satu jamaah (upsert berdasarkan `jadwalId` + `jamaahId`).

- **Auth:** Diperlukan (`presensi.create`)
- **Body:**
```json
{
  "jadwalId": "cjd_...",
  "jamaahId": "cjm_...",
  "namaJamaah": "A. N. Drean",
  "kategoriId": "ckg_...",
  "desaId": "cds_...",
  "kelompokId": "ckp_...",
  "status": "Hadir",
  "keterangan": "Datang tepat waktu",
  "lintasKelompok": false
}
```
- **Aturan:**
  - `status` harus salah satu: `Hadir`, `Izin`, `Sakit`
  - Jadwal harus berstatus `"Buka"`
  - Cakupan wilayah diverifikasi (Desa hanya absen di desanya, dst.)
  - `sumber` otomatis diisi `"PENGURUS"`
  - `dicatatOleh` diisi userId pengurus

---

## 📊 Rekap

### `GET /api/admin/presensi/rekap?jadwalId=...`
Mendapatkan rekap agregat kehadiran per jadwal.

- **Auth:** Diperlukan (`presensi.view`)
- **Response:**
```json
{
  "jadwalId": "cjd_...",
  "total": 45,
  "hadir": 30,
  "izin": 10,
  "sakit": 5,
  "sumberPengurus": 25,
  "sumberPublik": 20,
  "rincianDesa": [
    {
      "desa": "PELITA",
      "kelompok": [
        { "kelompok": "BHAKTI", "hadir": 10, "izin": 2, "sakit": 1, "total": 13 }
      ]
    }
  ],
  "presensi": [...]
}
```

---

## 🌐 Publik (Tanpa Login)

### `GET /api/public/jadwal/[slug]`
Mengambil informasi jadwal melalui slug publik.

- **Auth:** Tidak diperlukan
- **Syarat:** `slugPublik` valid dan `linkPublikAktif = true`

---

### `GET /api/public/jamaah?q=...`
Pencarian jamaah untuk autocomplete form publik.

- **Auth:** Tidak diperlukan
- **Query:** `q` (nama jamaah, case-insensitive)
- **Response:**
```json
[
  {
    "id": "cjm_...",
    "nama": "A. N. Drean",
    "desa": { "nama": "PELITA" },
    "kelompok": { "nama": "PAGAR DRUM" }
  }
]
```

---

### `POST /api/absen/[slug]`
Jamaah mengisi izin/sakit melalui link publik.

- **Auth:** Tidak diperlukan
- **Rate Limit:** Maksimal 5 kiriman/menit per IP
- **Body:**
```json
{
  "jamaahId": "cjm_...",
  "status": "Izin",
  "keterangan": "Sakit demam"
}
```
- **Aturan Ketat:**
  1. Hanya `POST` — tidak ada update/hapus
  2. Status hanya boleh `"Izin"` atau `"Sakit"` (`"Hadir"` ditolak)
  3. `slugPublik` harus valid dan `linkPublikAktif = true`
  4. Jadwal harus berstatus `"Buka"`
  5. Jamaah harus ada di database
  6. Satu jamaah satu absensi per jadwal (jika sudah ada, ditolak)
  7. `sumber` diisi `"PUBLIK"`, `dicatatOleh = null`
- **Response (200):**
```json
{
  "ok": true,
  "message": "Terima kasih, izin Anda telah tercatat.",
  "presensi": { "id": "...", "nama": "A. N. Drean", "status": "Izin" }
}
```

---

## 🗂️ Struktur Folder API

```
app/api/
├── admin/
│   ├── jadwal/
│   │   ├── route.ts              # GET, POST
│   │   ├── [id]/
│   │   │   ├── route.ts          # PUT, DELETE
│   │   │   ├── buka/route.ts     # POST
│   │   │   ├── tutup/route.ts    # POST
│   │   │   └── bagikan/route.ts  # POST
│   ├── presensi/
│   │   ├── route.ts              # GET, POST
│   │   └── rekap/route.ts        # GET
│   ├── roles/
│   │   ├── route.ts              # GET, POST
│   │   └── [name]/route.ts       # DELETE
│   ├── role-permission/
│   │   └── route.ts              # GET, PUT
│   └── [resource]/               # CRUD generik (Desa, Kelompok, Kategori, Jamaah, Jadwal, Presensi, Pengguna)
│       ├── route.ts
│       └── [id]/route.ts
├── public/
│   ├── jadwal/
│   │   └── [slug]/route.ts      # GET
│   └── jamaah/
│       └── route.ts             # GET
└── absen/
    └── [slug]/route.ts          # POST (publik)
```

---

## 🔑 Kode Status & Error

| Status | Keterangan |
|--------|------------|
| 200 | Berhasil |
| 201 | Dibuat |
| 400 | Validasi gagal / field tidak lengkap |
| 401 | Belum login |
| 403 | Tidak memiliki izin/role |
| 404 | Data tidak ditemukan |
| 429 | Terlalu banyak permintaan (rate limit publik) |
| 500 | Kesalahan server |

Contoh response error:
```json
{ "error": "Jadwal sudah ditutup." }
```

---

## 🗄️ Perubahan Database (Prisma)

Model yang ditambah/ubah:

| Model | Field Baru | Keterangan |
|-------|------------|------------|
| `User` | `desa`, `kelompok`, `presensiDicatat`, `jadwalDibuat` | Relasi wilayah dan audit trail |
| `Jadwal` | `slugPublik`, `linkPublikAktif`, `dibuatOleh`, `ditutupPada` | Link publik & status sesi |
| `Presensi` | `sumber`, `dicatatOleh`, `lintasKelompok` | Sumber absensi dan pelanggaran kelompok |

Run migrasi:
```bash
npx prisma migrate dev --name absensi
npx prisma generate
```

---

## 🎯 Alur Singkat

1. **Super Admin / Pengurus Daerah** buat jadwal → status `Tutup`
2. Buka sesi → status `Buka` (satu jadwal saja yang boleh buka)
3. Generate link publik → dapatkan `slug` dan `link`
4. Bagikan link ke jamaah via WhatsApp
5. **Pengurus** absen Hadir/Izin/Sakit di dashboard
6. **Jamaah** absen Izin/Sakit via link publik
7. Tutup sesi → data terkunci
8. Lihat unduh rekap di `/admin/rekap`
