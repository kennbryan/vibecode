import { CloudRain, ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CloudRain className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">CiviSense</h1>
            <p className="text-xs text-muted-foreground">Pantau banjir Bojongsoang dan Telkom University</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground sm:flex">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          Laporan anonim
        </div>
      </div>
    </header>
  );
}
