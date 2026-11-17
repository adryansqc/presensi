# Flutter Android App — Presensi Jambi Kota 1

Dokumen ini adalah spesifikasi lengkap untuk membuat aplikasi Android dengan Flutter yang menjadi klien mobile dari sistem presensi pengajian yang sudah ada (Next.js + Prisma + PostgreSQL).

---

## 1. Ringkasan

Aplikasi Flutter Android berfungsi sebagai klien mobile untuk sistem presensi pengajian. Pengguna dapat login, mengelola data master (desa, kelompok, kategori, jamaah, pengguna), membuat/mengatur jadwal, mencatat presensi, melihat rekap, serta absensi publik via link slug.

Backend yang sudah ada menggunakan **Next.js App Router + Prisma + PostgreSQL**. Flutter akan berkomunikasi melalui REST API yang sudah tersedia di `app/api/`.

---

## 2. Teknologi yang Disarankan

| Komponen | Pilihan |
|----------|---------|
| Framework | Flutter (stable) |
| Bahasa | Dart |
| State Management | Provider / Riverpod / Bloc |
| HTTP Client | `dio` atau `http` |
| Local Storage | `shared_preferences` (token/session) |
| Form Validation | `flutter_form_builder` atau manual |
| Date/Time Picker | `showDatePicker`, `showTimePicker` |
| PDF Export | `pdf` + `printing` atau `syncfusion_flutter_pdf` |
| Excel Export | `excel` |
| Image/Picker | `image_picker` (opsional) |
| Navigation | `go_router` |

---

## 3. Fitur Utama (Mapping dari Web ke Mobile)

| Fitur Web | Fitur Mobile | Role yang Boleh |
|-----------|--------------|-----------------|
| Login | Login (email/password) | Semua |
| Dashboard | Dashboard ringkasan statistik | Semua (tergantung permission) |
| Admin / [resource] | CRUD Desa, Kelompok, Kategori, Jamaah, Pengguna | Super_Admin / Admin_CAI / Desa / Kelompok |
| Role | Manajemen Hak Akses Role | Super_Admin |
| Jadwal | Buat, lihat, edit, hapus, buka/tutup sesi, bagikan link publik | Super_Admin / Admin_CAI / Desa / Kelompok |
| Presensi | Tandai Hadir/Izin/Sakit per jadwal, detail presensi, cetak/export | Pengurus |
| Rekap | Lihat rekap kehadiran per jadwal per desa/kelompok | Semua (terjadwal scope) |
| Absen Publik | Izin/Sakit via link slug (tanpa login) | Publik / Jamaah |

---

## 4. Struktur Folder Flutter (Disarankan)

```
lib/
  main.dart
  app.dart
  core/
    constants/
      api_constants.dart
      app_colors.dart
      app_strings.dart
    services/
      api_service.dart
      auth_service.dart
      storage_service.dart
    utils/
      date_utils.dart
      validators.dart
  models/
    user.dart
    role.dart
    desa.dart
    kelompok.dart
    kategori.dart
    jamaah.dart
    jadwal.dart
    presensi.dart
    rekap.dart
    permission.dart
  providers/
    auth_provider.dart
    user_provider.dart
    desa_provider.dart
    kelompok_provider.dart
    kategori_provider.dart
    jamaah_provider.dart
    jadwal_provider.dart
    presensi_provider.dart
    rekap_provider.dart
    permission_provider.dart
  screens/
    splash_screen.dart
    login_screen.dart
    dashboard_screen.dart
    admin_shell.dart // drawer/bottom nav wrapper
    desa_list_screen.dart
    desa_form_screen.dart
    kelompok_list_screen.dart
    kelompok_form_screen.dart
    kategori_list_screen.dart
    kategori_form_screen.dart
    jamaah_list_screen.dart
    jamaah_form_screen.dart
    jamaah_import_screen.dart
    pengguna_list_screen.dart
    pengguna_form_screen.dart
    role_permission_screen.dart
    jadwal_list_screen.dart
    jadwal_form_screen.dart
    jadwal_detail_screen.dart
    presensi_list_screen.dart
    presensi_detail_screen.dart
    rekap_screen.dart
    profile_screen.dart
    public_absen_screen.dart // tanpa login
  widgets/
    custom_button.dart
    custom_textfield.dart
    status_badge.dart
    search_field.dart
    confirm_dialog.dart
  routes/
    app_router.dart
```

---

## 5. Model Data (Dart)

Contoh model yang perlu dibuat sesuai schema Prisma:

```dart
// user.dart
class User {
  final String id;
  final String? name;
  final String? email;
  final String? image;
  final String? password;
  final String role; // Super_Admin, Admin_CAI, Desa, Kelompok
  final String? desaId;
  final String? kelompokId;
  final bool hidden;
  final DateTime createdAt;

  User({
    required this.id,
    this.name,
    this.email,
    this.image,
    this.password,
    required this.role,
    this.desaId,
    this.kelompokId,
    this.hidden = false,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      image: json['image'],
      password: json['password'],
      role: json['role'] ?? 'user',
      desaId: json['desaId'],
      kelompokId: json['kelompokId'],
      hidden: json['hidden'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

// jadwal.dart
class Jadwal {
  final String id;
  final DateTime tanggal;
  final String jenisPengajian;
  final String jamMulai;
  final String jamSelesai;
  final String tingkat; // Daerah, Desa, Kelompok
  final List<String> desaIds;
  final List<String> kelompokIds;
  final List<String> kategoriIds;
  final String statusBuka; // Buka, Tutup
  final String? slugPublik;
  final bool linkPublikAktif;
  final String? dibuatOleh;

  Jadwal({
    required this.id,
    required this.tanggal,
    required this.jenisPengajian,
    required this.jamMulai,
    required this.jamSelesai,
    required this.tingkat,
    required this.desaIds,
    required this.kelompokIds,
    required this.kategoriIds,
    required this.statusBuka,
    this.slugPublik,
    required this.linkPublikAktif,
    this.dibuatOleh,
  });

  factory Jadwal.fromJson(Map<String, dynamic> json) {
    return Jadwal(
      id: json['id'],
      tanggal: DateTime.parse(json['tanggal']),
      jenisPengajian: json['jenisPengajian'],
      jamMulai: json['jamMulai'],
      jamSelesai: json['jamSelesai'],
      tingkat: json['tingkat'],
      desaIds: List<String>.from(json['desaIds'] ?? []),
      kelompokIds: List<String>.from(json['kelompokIds'] ?? []),
      kategoriIds: List<String>.from(json['kategoriIds'] ?? []),
      statusBuka: json['statusBuka'],
      slugPublik: json['slugPublik'],
      linkPublikAktif: json['linkPublikAktif'] ?? false,
      dibuatOleh: json['dibuatOleh'],
    );
  }
}

// presensi.dart
class Presensi {
  final String id;
  final String jadwalId;
  final String? jamaahId;
  final String namaJamaah;
  final String kategoriId;
  final String desaId;
  final String kelompokId;
  final String status; // Hadir, Izin, Sakit
  final String? keterangan;
  final String sumber; // PENGURUS, PUBLIK
  final String? dicatatOleh;
  final DateTime createdAt;

  Presensi({
    required this.id,
    required this.jadwalId,
    this.jamaahId,
    required this.namaJamaah,
    required this.kategoriId,
    required this.desaId,
    required this.kelompokId,
    required this.status,
    this.keterangan,
    required this.sumber,
    this.dicatatOleh,
    required this.createdAt,
  });

  factory Presensi.fromJson(Map<String, dynamic> json) {
    return Presensi(
      id: json['id'],
      jadwalId: json['jadwalId'],
      jamaahId: json['jamaahId'],
      namaJamaah: json['namaJamaah'],
      kategoriId: json['kategoriId'],
      desaId: json['desaId'],
      kelompokId: json['kelompokId'],
      status: json['status'],
      keterangan: json['keterangan'],
      sumber: json['sumber'],
      dicatatOleh: json['dicatatOleh'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

---

## 6. Layanan API (api_service.dart)

Base URL: `http://localhost:3000` (dev) atau production URL.

Endpoint yang harus diimplementasi:

### Auth
- `POST /api/auth/[...nextauth]` — Login credentials (NextAuth)
- `POST /api/auth/signout` — Logout (opsional via NextAuth)

### Data Master (Generic CRUD)
- `GET /api/admin/:resource` — List data (desa, kelompok, kategori, jamaah, jadwal, presensi, pengguna)
- `POST /api/admin/:resource` — Create
- `PUT /api/admin/:resource/:id` — Update
- `DELETE /api/admin/:resource/:id` — Delete

### Jadwal
- `POST /api/admin/jadwal/:id/buka` — Buka sesi
- `POST /api/admin/jadwal/:id/tutup` — Tutup sesi
- `POST /api/admin/jadwal/:id/bagikan` — Generate link publik

### Presensi
- `GET /api/admin/presensi?jadwalId=...` — Daftar presensi
- `POST /api/admin/presensi` — Simpan/Upsert presensi
- `GET /api/admin/presensi/rekap?jadwalId=...` — Rekap agregat

### Publik (Tanpa Login)
- `GET /api/public/jadwal/:slug` — Info jadwal publik + daftar desa/kelompok
- `GET /api/public/jamaah?kelompokId=...&q=...` — Daftar jamaah
- `POST /api/absen/:slug` — Kirim absensi Izin/Sakit

### Role & Permission
- `GET /api/admin/roles` — Daftar role + permission
- `PUT /api/admin/role-permission` — Simpan permission role
- `POST /api/admin/roles` — Buat role baru
- `DELETE /api/admin/roles/:name` — Hapus role

Contoh `Dio` setup:

```dart
class ApiService {
  static Dio? _dio;

  static Dio get instance {
    _dio ??= Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: Duration(seconds: 30),
      receiveTimeout: Duration(seconds: 30),
    ))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            final token = StorageService.token;
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            return handler.next(options);
          },
        ),
      );
    return _dio!;
  }
}
```

> **Catatan:** NextAuth v4 biasanya menggunakan cookie/session, bukan Bearer token standar. Untuk Flutter, disarankan menambahkan endpoint API login sederhana di backend yang mengembalikan JWT, atau menyesuaikan NextAuth agar menerima `Authorization: Bearer` dari mobile.

---

## 7. Manajemen State & Auth

### AuthProvider (contoh menggunakan Provider)

```dart
class AuthProvider extends ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiService.instance.post('/api/auth/signin/credentials', data: {
        'email': email,
        'password': password,
        'provider': 'credentials',
        'callbackUrl': '/',
        'json': true,
      });
      _token = res.data['token'];
      _user = User.fromJson(res.data['user']);
      await StorageService.saveToken(_token!);
      await StorageService.saveUser(_user);
      return true;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    await StorageService.clear();
    notifyListeners();
  }
}
```

---

## 8. Layar per Layar (UI & Fitur)

### 8.1 Splash Screen
- Tampilkan logo "Presensi Jambi Kota 1"
- Cek apakah ada token disimpan di `shared_preferences`
- Arahkan ke `LoginScreen` atau `DashboardScreen`

### 8.2 Login Screen
- Input: Email, Password
- Tombol "Masuk"
- Navigasi ke dashboard berdasarkan role
- Tangani error: email salah, password salah, akun tidak aktif

### 8.3 Dashboard Screen (Role-Based)
Kartu statistik:
- Total Jamaah
- Total Kelompok
- Total Desa
- Total Jadwal
- Total Presensi
- Total Pengguna

Tombol akses cepat:
- Tambah Jamaah
- Buat Jadwal
- Catat Presensi
- Kelola Pengguna

Grafik/ringkasan sebaran kelompok per desa (bar chart sederhana).

### 8.4 Admin Shell (Wrapper)
- Drawer navigasi kiri (atau Bottom Navigation Bar untuk mobile)
- Menu sesuai permission:
  - Dashboard (`dashboard.view`)
  - Data Master: Desa, Kelompok, Kategori (`desa.view`, `kelompok.view`, `kategori.view`)
  - Operasional: Jamaah, Jadwal, Presensi (`jamaah.view`, `jadwal.view`, `presensi.view`)
  - Sistem: Pengguna, Hak Akses (`pengguna.view`, `role.manage`)
- Header menampilkan nama, email, role, avatar inisial
- Tombol Keluar (logout dengan konfirmasi)

### 8.5 CRUD Layar (Desa, Kelompok, Kategori, Jamaah, Pengguna)
- **List Screen**: Search bar, tabel/kartu data, tombol Tambah (FloatingActionButton), pagination sederhana
- **Form Screen**: Input field sesuai `FieldDef` dari backend (text, email, password, number, date, select, checkbox, multiSelect, textarea)
- Validasi field wajib
- Konfirmasi hapus dengan dialog

### 8.6 Jadwal Management
- **List**: Tabel jadwal dengan kolom Tanggal, Jenis, Waktu, Tingkat, Lokasi, Status (Buka/Tutup badge)
- Aksi per baris: Edit, Buka/Tutup, Bagikan Link, Hapus
- **Form**: Tanggal, Jenis Pengajian, Jam Mulai/Selesai, Tingkat (Daerah/Desa/Kelompok), Kategori (multi), Desa (multi), Kelompok (multi), Status Buka
- **Detail**: Tampilkan detail jadwal + tombol buka/tutup + salin link publik

### 8.7 Presensi Detail (per Jadwal)
- Header: Info jadwal (tanggal, jenis, waktu, tingkat, lokasi, status)
- Tombol: Bagikan Link Publik, Cetak PDF, Unduh Excel, Simpan Presensi
- Daftar jamaah dikelompokkan per Desa → Kelompok
- Setiap jamaah: tombol Hadir / Izin / Sakit (toggle), input keterangan
- Statistik: Hadir, Izin, Sakit, Belum, Total

### 8.8 Rekap Screen
- Dropdown pilihan jadwal
- Ringkasan: Total, Hadir, Izin, Sakit, Sumber Pengurus, Sumber Publik
- Rincian per Desa → Kelompok dengan jumlah tiap status

### 8.9 Role & Permission Screen
- Daftar role di sidebar kiri
- Checklist permission per grup (Dashboard, Data Master, Operasional, Sistem)
- Tombol Simpan Hak Akses
- Tombol Tambah Role / Hapus Role (hanya Super_Admin)

### 8.10 Public Absen Screen (Tanpa Login)
- Dibuka via link `/absen/:slug`
- Tampilkan info jadwal
- Pilih Desa → Kelompok → Jamaah
- Pilih status: Izin atau Sakit (Hadir tidak diperbolehkan publik)
- Input keterangan (opsional)
- Tombol Kirim
- Tampilkan rekap acara (Hadir/Izin/Sakit)

---

## 9. Langkah Pengembangan (Step-by-Step)

### Langkah 1: Siapkan Project Flutter
```bash
flutter create presensi_jambi_mobile
cd presensi_jambi_mobile
flutter pub add dio shared_preferences provider go_router intl excel pdf printing
```

### Langkah 2: Konfigurasi Android
- `android/app/src/main/AndroidManifest.xml`: Tambahkan `INTERNET` permission
- Set `minSdkVersion` minimal 21
- Aktifkan Java 17 / Kotlin jika diperlukan

### Langkah 3: Buat Core & Services
- `api_constants.dart`: base URL, timeout
- `api_service.dart`: Dio client + interceptor token
- `storage_service.dart`: simpan ambil token & user
- `auth_service.dart`: login/logout/me

### Langkah 4: Buat Model Semua Entity
Buat class Dart untuk setiap tabel Prisma dengan `fromJson` dan `toJson`.

### Langkah 5: Buat Auth Flow
- Splash → cek token
- Login screen
- Simpan token & user ke SharedPreferences
- Redirect ke dashboard sesuai role

### Langkah 6: Buat Admin Shell + Navigasi
- Drawer atau BottomNav
- Filter menu berdasarkan permission yang disimpan di user

### Langkah 7: Implementasikan CRUD Generic
- Buat widget `CrudList` dan `CrudForm` yang dapat digunakan untuk Desa, Kelompok, Kategori, Jamaah, Pengguna
- Panggil endpoint `/api/admin/:resource`

### Langkah 8: Jadwal & Presensi
- Jadwal list, form, buka/tutup, bagikan link
- Presensi detail dengan toggle status dan export PDF/Excel

### Langkah 9: Rekap
- Ambil data dari `/api/admin/presensi/rekap`
- Tampilkan agregat per desa/kelompok

### Langkah 10: Public Absen (Tanpa Login)
- Screen yang menerima `slug` parameter
- Panggil API publik untuk load jadwal + jamaah
- POST ke `/api/absen/:slug`

### Langkah 11: Role & Permission
- Screen khusus Super_Admin
- Ambil data dari `/api/admin/roles` dan `/api/admin/role-permission`

### Langkah 12: Testing & Build
```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --release
```

---

## 10. Contoh Tampilan (Wireframe Teks)

```
┌─────────────────────────────────────┐
│  Presensi Jambi Kota 1   [ ☰ ]      │
├─────────────────────────────────────┤
│  Halo, Budi (Super Admin)           │
│  17 Nov 2026                        │
├─────────────────────────────────────┤
│  [ Total Jamaah: 1250 ]  [ Total    │
│    Kelompok: 45 ]   [ Total Jadwal: │
│    12 ]                               │
├─────────────────────────────────────┤
│  [ Tambah Jamaah ] [ Buat Jadwal ]  │
│  [ Catat Presensi ] [ Lihat Rekap ] │
├─────────────────────────────────────┤
│  Jadwal Terbaru                     │
│  ┌─────────────────────────────┐    │
│  │ Pengajian Rutin             │    │
│  │ 17 Nov • 19:00-21:00 • Desa │    │
│  │ PELITA ● Buka               │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

```
┌─────────────────────────────────────┐
│ ← Kembali    Detail Jadwal &        │
│    Presensi                          │
├─────────────────────────────────────┤
│  Pengajian Rutin                    │
│  17 Nov 2026 • 19:00 - 21:00        │
│  Desa PELITA ● Sesi Buka            │
├─────────────────────────────────────┤
│  [H: 45] [I: 10] [S: 3] [Blm: 42]   │
│  Total: 100                         │
├─────────────────────────────────────┤
│  PELITA — BHAKTI                    │
│  1. Ahmad ● ○ ○   [Keterangan__]    │
│  2. Siti ○ ● ○    [Keterangan__]    │
├─────────────────────────────────────┤
│  [ Bagikan Link ] [ Simpan ] [PDF]  │
└─────────────────────────────────────┘
```

---

## 11. Catatan Penting untuk Implementasi

1. **NextAuth Cookie:** Jika backend tetap pakai NextAuth default (cookie-based), Flutter harus menyimpan cookie atau menambahkan custom login endpoint di Next.js yang mengembalikan JWT.
2. **Scope Wilayah:** Pastikan Flutter mengirim `userId` atau token yang valid sehingga backend dapat menentukan scope (`desa`/`kelompok`/`none`) dan memfilter data dengan benar.
3. **Tanggal & Waktu:** Gunakan `intl` package untuk format `id-ID`. Tanggal jadwal dikirim sebagai `YYYY-MM-DD`, waktu sebagai `HH:mm`.
4. **Export PDF/Excel:** Untuk cetak presensi di mobile, gunakan paket `pdf` untuk generate file dan `printing` atau `share_plus` untuk membuka/menyimpan.
5. **Rate Limit Publik:** Endpoint `/api/absen/[slug]` memiliki rate limit 5 kiriman/menit per IP. Tampilkan pesan yang sesuai jika terkena limit.
6. **Status Sesi:** Jadwal hanya dapat diisi presensi jika `statusBuka === "Buka"`. Pastikan UI menampilkan peringatan jika sesi ditutup.

---

## 12. Dependensi `pubspec.yaml` (Contoh)

```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  dio: ^5.7.0
  shared_preferences: ^2.3.0
  provider: ^6.1.2
  go_router: ^14.2.0
  intl: ^0.19.0
  excel: ^4.0.6
  pdf: ^3.11.0
  printing: ^5.13.0
  image_picker: ^1.1.0
  url_launcher: ^6.3.1
  share_plus: ^9.0.0
  connectivity_plus: ^6.1.0
```

---

Dokumen ini dapat dijadikan pedoman utama untuk tim pengembang Flutter yang akan membangun aplikasi Android presensi ini. Jika ada endpoint atau fitur yang ingin diperluas, silakan disesuaikan dengan kebutuhan tim.