"use client";

import L from "leaflet";
import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { toast } from "sonner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ClickToPinHandler } from "@/components/map/ClickToPinHandler";
import { LocateMeButton } from "@/components/map/LocateMeButton";
import { MapBounds } from "@/components/map/MapBounds";
import { FloodMarker } from "@/components/map/FloodMarker";
import { ReportForm } from "@/components/reports/ReportForm";
import { ReportList } from "@/components/reports/ReportList";
import { ViewToggle } from "@/components/layout/ViewToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAP_CENTER, SEVERITY_CONFIG } from "@/lib/constants";
import { useReports } from "@/hooks/useReports";
import type { ChatUnreadState } from "@/types/chat";
import type { FloodReport, ReportFilters } from "@/types/report";

type FloodMapClientProps = {
  initialReports: FloodReport[];
};

type ViewMode = "map" | "list";
type SelectedPositionSource = "picked" | "located";
type ChatFocusTarget = { lat: number; lng: number; nonce: number };

function pinIcon() {
  return L.icon({
    iconUrl: SEVERITY_CONFIG.moderate.marker,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
  });
}


function ChatLocationFocus({ target }: { target: ChatFocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.setView([target.lat, target.lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [map, target]);

  return null;
}

export default function FloodMapClient({ initialReports }: FloodMapClientProps) {
  const [view, setView] = useState<ViewMode>("map");
  const [filters, setFilters] = useState<ReportFilters>({ severity: "all", timeWindow: "5h", sort: "newest" });
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPositionSource, setSelectedPositionSource] = useState<SelectedPositionSource>("picked");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatFocusTarget, setChatFocusTarget] = useState<ChatFocusTarget | null>(null);
  const [chatUnread, setChatUnread] = useState<ChatUnreadState>({ count: 0, hasSevereSystemMessage: false });
  const { reports, isLoading, error, refresh, confirmReport, hasVoted } = useReports({ initialReports, filters });
  const selectedPinIcon = useMemo(() => pinIcon(), []);

  function handleMapClick(position: { lat: number; lng: number }) {
    setSelectedPosition(position);
    setSelectedPositionSource("picked");
  }

  function handleLocate(position: { lat: number; lng: number }) {
    setSelectedPosition(position);
    setSelectedPositionSource("located");
  }

  function openReportDialog() {
    const pos = selectedPosition ?? { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };
    setSelectedPosition(pos);
    setIsReportDialogOpen(true);
  }

  function handleCreated(report: FloodReport) {
    setIsReportDialogOpen(false);
    setSelectedPosition(null);
    void refresh();
    toast.success(`Laporan untuk ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)} aktif.`);
  }

  function handleChatLocation(position: { lat: number; lng: number }) {
    setView("map");
    setIsChatOpen(false);
    setChatFocusTarget({ ...position, nonce: Date.now() });
    toast.info("Peta diarahkan ke lokasi dari chat.");
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-65px)] max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Laporan aktif: {reports.length}</p>
          <p className="text-xs text-muted-foreground">Ketuk peta untuk memilih lokasi laporan.</p>
        </div>
        <div className="flex gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label="Muat ulang laporan">
            <RefreshCw className="size-4" />
          </Button>
          <ChatBubble
            hasSevereSystemMessage={chatUnread.hasSevereSystemMessage}
            isOpen={isChatOpen}
            unreadCount={chatUnread.count}
            onOpen={() => setIsChatOpen(true)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}

      <div className={view === "map" ? "relative min-h-0 flex-1 overflow-hidden rounded-lg border" : "hidden"}>
        <MapContainer
          center={[MAP_CENTER.lat, MAP_CENTER.lng]}
          zoom={15}
          minZoom={14}
          maxZoom={19}
          zoomControl={false}
          attributionControl
          className="h-full min-h-[520px] w-full"
          preferCanvas
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds />
          <ClickToPinHandler onPick={handleMapClick} enabled />
          {reports.map((report) => (
            <FloodMarker key={report.id} report={report} onConfirm={confirmReport} hasVoted={hasVoted(report.id)} />
          ))}
          {selectedPosition && selectedPositionSource === "picked" && (
            <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={selectedPinIcon} />
          )}
          <LocateMeButton onInsideBounds={handleLocate} />
          <ChatLocationFocus target={chatFocusTarget} />
        </MapContainer>

        <Button
          className="absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 shadow-lg"
          onClick={openReportDialog}
          aria-label={selectedPosition ? "Buat laporan di titik yang dipilih" : "Buat laporan di Telkom University"}
        >
          <Plus className="size-4" />
          {selectedPosition ? "Lapor di titik ini" : "Lapor di Tel-U"}
        </Button>

      </div>

      <div className={view === "list" ? "min-h-0 flex-1 overflow-y-auto pb-4" : "hidden"}>
        <ReportList
          reports={reports}
          filters={filters}
          onFiltersChange={setFilters}
          onConfirm={confirmReport}
          hasVoted={hasVoted}
          isLoading={isLoading}
        />
      </div>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Laporan banjir baru</DialogTitle>
            <DialogDescription>
              Unggah foto dan detail singkat agar warga lain dapat memilih rute aman.
            </DialogDescription>
          </DialogHeader>
          <ReportForm position={selectedPosition} onCreated={handleCreated} />
        </DialogContent>
      </Dialog>

      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onUnreadChange={setChatUnread}
        onViewLocation={handleChatLocation}
      />
    </main>
  );
}
