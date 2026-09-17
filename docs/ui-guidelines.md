# PILOK Form UI Guidelines

Panduan ini adalah baseline visual untuk seluruh form PILOK. Gunakan komponen
bersama pada src/components/FormLayout.tsx dan class komponen pada src/index.css
sebelum membuat pola baru.

## Prinsip

- Utamakan keterbacaan, kecepatan input, dan hierarchy yang jelas.
- Gunakan tampilan korporat yang tenang: latar abu muda, card putih, ink gelap,
  dan aksen merah SIG secukupnya.
- Jangan menambahkan navigasi atau dekorasi yang tidak mendukung tugas form.
- Pertahankan perilaku responsif mulai dari lebar minimum 320 px.

## Branding dan shell

- Gunakan FormShell untuk container, lebar konten, dan BrandHeader.
- Logo default adalah /branding/sig-logo-black.png pada header putih.
- Aset logo bersumber dari halaman Corporate Identity resmi SIG:
  https://sig.id/identitas-perusahaan.
- Pertahankan rasio, clear space, dan alt text Logo SIG. Untuk varian header
  lain, ganti melalui prop logoSrc; jangan ubah artwork logo.
- Format judul: PILOK - [Nama Form], diikuti satu kalimat deskripsi singkat.

## Section dan field

- Major section memakai SectionCard dan SectionHeader; step badge hanya untuk
  urutan utama.
- Nested entity memakai panel yang lebih ringan, seperti wilayah-card dan
  supervisor-panel.
- Field memakai tinggi 44 px, radius 8 px, label di atas, helper/error tepat di
  bawah, dan focus ring yang terlihat.
- Gunakan SearchableSelect untuk master data. Nilai terpilih harus jelas,
  label panjang harus truncate, dan nilai lengkap tetap tersedia melalui title
  atau accessible label.
- Upload memakai upload-box saat kosong dan file-selected untuk file baru atau
  tersimpan. Jangan mengubah semantics file untuk kebutuhan visual.

## Actions dan feedback

- button-primary: satu aksi simpan atau lanjut utama per area.
- button-secondary: tambah, batal, atau aksi netral.
- button-danger: konfirmasi destruktif; icon-only delete memakai
  icon-button-danger.
- button-text: aksi utility ringan seperti retry atau ganti file.
- Tempatkan aksi final di ActionBar. Pada mobile, aksi utama memenuhi lebar.
- Gunakan StatusBanner dengan variant info, success, warning, atau error;
  jangan membuat box status ad-hoc.

## Spacing dan typography

- Gunakan ritme utama 16/20/24/28 px dan gap field 20 px.
- Judul halaman 24–30 px, judul section 20 px, label dan body 14 px.
- Batasi shadow pada surface utama; nested card cukup memakai border halus.
- Semantic colors hanya untuk status. Merah SIG adalah aksen brand, sedangkan
  merah error atau destructive harus tetap memiliki konteks dan label jelas.

## Reuse pada form PILOK berikutnya

Mulai dari FormShell, susun SectionCard, lalu tutup form dengan ActionBar.
Gunakan komponen field yang ada sebelum membuat varian baru. Business state dan
validation tetap berada di form/domain layer; komponen layout tidak boleh
menentukan aturan bisnis.
