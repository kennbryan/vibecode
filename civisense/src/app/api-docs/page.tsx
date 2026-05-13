import { getBaseUrl } from "@/lib/utils";

export const metadata = {
  title: "Dokumentasi API CiviSense",
};

export default function ApiDocsPage() {
  const baseUrl = getBaseUrl();
  const iframe = `<iframe src="${baseUrl}/embed?severity=all&height=600&zoom=15" width="100%" height="600" loading="lazy" title="Peta banjir CiviSense"></iframe>`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Dokumentasi API CiviSense</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Endpoint publik read-only untuk menampilkan laporan banjir aktif Bojongsoang. Gunakan atribusi: Data oleh CiviSense.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rate limit</h2>
        <p className="text-sm text-muted-foreground">20 request per menit per IP. Response dapat di-cache selama 60 detik.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">GET /api/public/reports/active</h2>
        <p className="text-sm text-muted-foreground">Mengembalikan array laporan aktif. Tidak ada data pribadi; nama pelapor hanya muncul jika warga mengisinya sendiri.</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`[
  {
    "id": "uuid",
    "latitude": -6.9733,
    "longitude": 107.6309,
    "severity": "light | moderate | severe",
    "water_depth": "ankle | calf | knee | thigh | waist | above_waist | null",
    "comment": "Keterangan warga",
    "reporter_name": "Nama opsional atau null",
    "photo_url": "https://...",
    "confirmation_count": 1,
    "created_at": "ISO timestamp",
    "expires_at": "ISO timestamp"
  }
]`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">GET /api/public/reports/stats</h2>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`{
  "active_count": 12,
  "by_severity": { "light": 4, "moderate": 6, "severe": 2 },
  "last_updated": "ISO timestamp"
}`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Embed iframe</h2>
        <p className="text-sm text-muted-foreground">
          Route embed mengizinkan framing dari domain lain melalui header khusus. Tradeoff-nya: halaman embed memang bisa dipasang pihak ketiga, jadi hanya peta read-only yang tersedia di route ini.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{iframe}</pre>
      </section>
    </main>
  );
}
