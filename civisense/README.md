# CiviSense

CiviSense adalah platform laporan banjir komunitas untuk warga Bojongsoang dan mahasiswa Telkom University. Pengguna dapat mengetuk peta, mengirim foto, memilih tingkat banjir, lalu laporan aktif tampil sebagai pin berwarna di peta dan daftar.

## Fitur

- Peta Leaflet + OpenStreetMap dibatasi ke Bojongsoang `lat -7.000..-6.960`, `lng 107.610..107.650`
- Lapor banjir anonim tanpa login
- Kompresi foto client-side dengan target sekitar 300KB
- Pin warna: ringan `#EAB308`, sedang `#F97316`, parah `#DC2626`
- Perkiraan kedalaman air opsional: semata kaki sampai di atas pinggang
- Verifikasi komunitas: `Masih banjir` dan `Sudah surut`
- Expiry lunak setelah 6 jam lewat status `expired`
- Filter daftar berdasarkan tingkat, waktu, dan paling dikonfirmasi
- Polling 30 detik plus Supabase Realtime bila aktif
- Tombol `Lokasi saya` untuk memilih titik laporan dari geolokasi browser
- Rate limit berbasis IP untuk laporan dan konfirmasi agar endpoint mutasi tidak mudah dispam
- Mode peta `Pin`, `Cluster`, dan `Heatmap` untuk membaca kepadatan laporan
- Rute aman berbasis OSRM yang memilih alternatif dengan tabrakan paling sedikit terhadap titik banjir sedang/parah
- PWA installable dengan cache tile/laporan, indikator offline, dan antrean laporan saat koneksi putus
- Timeline laporan berisi foto awal dan riwayat konfirmasi, dengan foto konfirmasi opsional
- Endpoint publik read-only dan embed iframe untuk situs pihak ketiga
- Chat global anonim untuk info banjir real-time, verifikasi komunitas, dan 50 pesan terakhir saja

## Setup Supabase

1. Buat project baru di Supabase.
2. Buka SQL Editor, jalankan migration di `supabase/migrations/` secara berurutan.
3. Pastikan extension PostGIS aktif. Migration membuat tabel `public.flood_reports`, kolom `GEOGRAPHY(point, 4326)`, GIST index, RLS read policy, dan bucket Storage `flood-photos`. Upload dan update hanya lewat API server dengan secret key.
4. Buka Project Settings > API Keys, salin Project URL, publishable key, dan secret key. Jika project masih memakai key lama, gunakan anon key dan service role key.
5. Aktifkan Realtime untuk tabel `flood_reports` bila ingin update instan selain polling. Migration chat juga menambahkan `chat_messages` ke publication `supabase_realtime`; pastikan Realtime aktif di project Supabase.

## Environment

Salin `.env.example` ke `.env.local`, lalu isi:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key-for-server-routes-only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
IP_HASH_SECRET=replace-with-openssl-rand-hex-32
ADMIN_SECRET=replace-with-a-long-random-admin-secret
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

`SUPABASE_SECRET_KEY` hanya dipakai di API routes server. Jangan expose key ini ke browser. Jika project Supabase masih memakai key lama, aplikasi juga mendukung `NEXT_PUBLIC_SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY`.

`IP_HASH_SECRET` dipakai untuk HMAC-SHA256 alamat IP di fitur chat. Buat nilai acak dengan `openssl rand -hex 32`. Raw IP tidak disimpan atau dikirim ke browser.

`ADMIN_SECRET` dipakai untuk endpoint moderasi chat tanpa UI.

`UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` dipakai untuk rate limit server-side: 3 laporan per jam per IP, burst 1 laporan per 30 detik per IP, 10 konfirmasi per menit per IP, 1 pesan chat per menit per IP, 30 verifikasi chat per menit per IP, dan 10 laporan chat per menit per IP. Jika variabel ini kosong di local dev, rate limit dilewati dengan peringatan di console.

## Chat Global

Chat berada di satu ruang global anonim. Tidak ada nama, avatar, DM, sub-room, atau identitas yang ditampilkan. API chat hanya mengembalikan isi pesan, waktu, status sistem, lokasi opsional, jumlah verifikasi, `viewer_verified`, dan `viewer_is_author`; `ip_hash` tidak pernah dikirim ke browser.

Pesan dibatasi 1-280 karakter dan disaring kata kasar secara server-side. Jika pesan ke-51 masuk, trigger database menghapus pesan tertua sehingga hanya 50 baris terbaru yang tersimpan. Pesan dengan 3 laporan unik-IP disembunyikan dari daftar publik, tetapi tetap dihitung oleh cap 50 pesan.

Pesan sistem otomatis dibuat saat laporan banjir `Parah` masuk. Pesan ini ikut cap 50, menyertakan lokasi laporan, tetapi tidak bisa diverifikasi atau dilaporkan.

## Moderation

Endpoint moderasi dilindungi header `x-admin-secret` yang harus sama dengan `ADMIN_SECRET`.

```bash
curl -X POST http://localhost:3000/api/admin/chat/<message-id>/unhide \
  -H "x-admin-secret: $ADMIN_SECRET"

curl -X POST http://localhost:3000/api/admin/chat/<message-id>/delete \
  -H "x-admin-secret: $ADMIN_SECRET"
```

`unhide` menghapus flag untuk pesan tersebut, mengatur `flag_count` ke `0`, dan menampilkan pesan lagi. `delete` menghapus pesan permanen.

## Public API dan Embed

Endpoint publik tidak membutuhkan auth, mengirim header CORS `*`, dan di-cache 60 detik:

- `GET /api/public/reports/active` - array laporan aktif tanpa PII; `reporter_name` hanya diisi jika warga mengisi nama.
- `GET /api/public/reports/stats` - ringkasan `{ active_count, by_severity, last_updated }`.
- `/api-docs` - dokumentasi human-readable, shape response, rate limit publik 20 request/menit/IP, dan syarat atribusi `Data oleh CiviSense`.
- `/embed?severity=all&height=600&zoom=15` - peta read-only untuk iframe. Route ini sengaja mengizinkan `frame-ancestors *`; jangan menaruh form mutasi di route embed.

Contoh iframe:

```html
<iframe src="http://localhost:3000/embed?severity=all&height=600&zoom=15" width="100%" height="600" loading="lazy" title="Peta banjir CiviSense"></iframe>
```

## PWA dan Offline

CiviSense memakai `@ducanh2912/next-pwa` karena kompatibel dengan Next.js App Router dan tetap memakai Workbox runtime caching. App shell diprecache, tile OpenStreetMap memakai `CacheFirst` maksimal 200 entry selama 7 hari, dan `GET /api/reports` memakai `StaleWhileRevalidate` maksimal 50 entry selama 5 menit. `POST /api/reports` tidak pernah di-cache; saat offline, laporan disimpan di IndexedDB store `civisense:pending-reports` lalu dikirim ulang saat browser online.

## GitHub Safety

Sebelum push, pastikan file rahasia tetap lokal:

```bash
git check-ignore -v .env.local
git status --ignored -s
```

Yang aman di-commit:

- `.env.example` karena hanya berisi placeholder
- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sebagai nama variabel
- migration SQL, komponen, dan route code

Yang tidak boleh di-commit:

- `.env.local`
- `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` asli
- token Vercel, private key, password database, atau file `.pem`

Catatan: Supabase publishable key memang boleh ada di browser untuk read/realtime, tetapi bukan secret. Semua mutasi CiviSense tetap lewat `/api/reports`, dan API route memakai secret/service-role key hanya di server.

## Local Development

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy ke Vercel

1. Push repository ke GitHub/GitLab.
2. Import project di Vercel.
3. Tambahkan env vars yang sama seperti `.env.local`.
4. Deploy.
5. Set `NEXT_PUBLIC_SITE_URL` ke domain Vercel production.

Supabase project settings yang direkomendasikan:

- Enable Data API: on
- Automatically expose new tables: off
- Enable automatic RLS: on

## Architecture Decisions

Server-side validation: koordinat divalidasi di client, API route, dan SQL CHECK supaya laporan di luar Bojongsoang tetap tertolak walau request dibuat manual.

PostGIS: lokasi disimpan sebagai `GEOGRAPHY(point, 4326)` dengan GIST index agar siap untuk query jarak, clustering, dan analisis spasial tanpa migrasi ulang.

Client-side compression: foto dikompresi sebelum upload agar pengiriman lebih cepat di jaringan hujan/3G dan biaya Storage lebih terkendali.

No auth: laporan banjir saat hujan harus cepat. Anonymous-by-default menurunkan friksi, sementara verifikasi komunitas, expiry 6 jam, dan validasi lokasi menjaga kualitas data.
