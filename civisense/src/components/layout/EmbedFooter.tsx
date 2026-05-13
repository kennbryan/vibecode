import { getBaseUrl } from "@/lib/utils";

export function EmbedFooter() {
  const baseUrl = getBaseUrl();
  const snippet = `<iframe src="${baseUrl}/embed?severity=all&height=600&zoom=15" width="100%" height="600" loading="lazy" title="Peta banjir CiviSense"></iframe>`;

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-6">
        <div>
          <h2 className="text-sm font-semibold">Embed</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pasang peta CiviSense read-only di situs kampus atau kelurahan dengan atribusi Data oleh CiviSense.</p>
        </div>
        <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">{snippet}</pre>
      </div>
    </footer>
  );
}
