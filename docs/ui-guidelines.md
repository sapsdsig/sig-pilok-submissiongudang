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

## Mobile Containment & Overflow

Seluruh form PILOK harus tetap berada di dalam viewport pada lebar mobile dan
tidak boleh membuat horizontal page scrolling.

- Form control dan card menggunakan `width: 100%` dan `max-width: 100%`.
- Child flex/grid yang memuat konten dinamis menggunakan `min-width: 0` agar
  dapat menyusut mengikuti parent.
- Track responsive grid menggunakan `minmax(0, 1fr)` ketika konten berpotensi
  memperlebar kolom.
- Nilai dinamis panjang seperti nama file, nama gudang, kode, URL, dan label
  harus wrap atau truncate, bukan memperlebar parent.
- Existing-document/file component ditumpuk vertikal pada layar kecil ketika
  nama file dan aksi tidak dapat berada dalam satu baris secara nyaman.
- Aksi primer dan sekunder harus tetap dapat dijangkau tanpa horizontal scroll.
- Hindari fixed width untuk konten form pada mobile.
- Jangan menggunakan global overflow hiding sebagai solusi utama untuk child
  layout yang rusak.
- Validasi layout sekurangnya pada lebar sekitar 320, 360, 375, 390, dan 430 px.

### Long filenames

- Container nama file harus shrinkable.
- Gunakan ellipsis untuk state ringkas satu baris.
- Aksi boleh berpindah ke bawah nama file pada mobile.
- Sediakan nama file lengkap secara accessible melalui `title` atau mekanisme
  setara jika memungkinkan.
- Nama file tidak boleh menentukan lebar form atau card.

### Responsive Form Rows

Baris form multi-kolom harus menjadi satu kolom pada layar kecil. Setiap child
harus dapat menyusut dengan `min-width: 0`; gunakan track
`minmax(0, 1fr)` untuk menjaga konten tetap berada di dalam parent.

## Reuse pada form PILOK berikutnya

Mulai dari FormShell, susun SectionCard, lalu tutup form dengan ActionBar.
Gunakan komponen field yang ada sebelum membuat varian baru. Business state dan
validation tetap berada di form/domain layer; komponen layout tidak boleh
menentukan aturan bisnis.
