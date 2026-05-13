"use client";

import L from "leaflet";
import { Crosshair, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Marker, useMap } from "react-leaflet";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isWithinBojongsoangBounds } from "@/lib/geo";

type LocatedPosition = {
  lat: number;
  lng: number;
};

type LocateMeButtonProps = {
  onInsideBounds: (position: LocatedPosition) => void;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 30000,
};

export function LocateMeButton({ onInsideBounds }: LocateMeButtonProps) {
  const map = useMap();
  const [position, setPosition] = useState<LocatedPosition | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "civisense-location-marker",
        html: '<span class="civisense-location-marker__pulse"></span><span class="civisense-location-marker__dot"></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    [],
  );

  function showPermissionToast() {
    toast.error("Aktifkan izin lokasi di browser untuk fitur ini.", {
      description: "Buka pengaturan situs, lalu izinkan akses Lokasi untuk CiviSense.",
      action: {
        label: "Bantuan",
        onClick: () => {
          window.open("https://support.google.com/chrome/answer/142065?hl=id", "_blank", "noopener,noreferrer");
        },
      },
    });
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Peramban tidak mendukung fitur lokasi.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };

        setPosition(next);
        map.flyTo([next.lat, next.lng], Math.max(map.getZoom(), 17), { duration: 0.8 });
        setIsLocating(false);

        if (!isWithinBojongsoangBounds(next.lat, next.lng)) {
          toast.warning("Anda di luar area Bojongsoang. Geser peta untuk memilih titik di area.");
          return;
        }

        onInsideBounds(next);
        toast.success("Lokasi Anda dipilih untuk laporan.");
      },
      (error) => {
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          showPermissionToast();
          return;
        }

        toast.error("Gagal mendapatkan lokasi. Coba lagi atau ketuk peta.");
      },
      GEOLOCATION_OPTIONS,
    );
  }

  return (
    <>
      {position && <Marker position={[position.lat, position.lng]} icon={markerIcon} interactive={false} />}
      <div className="absolute bottom-20 right-3 z-[500] sm:bottom-4 sm:right-4">
        <Button
          type="button"
          variant="secondary"
          className="shadow-lg"
          onClick={locate}
          disabled={isLocating}
          aria-label="Gunakan lokasi saya"
        >
          {isLocating ? <Loader2 className="animate-spin" /> : <Crosshair />}
          Lokasi saya
        </Button>
      </div>
    </>
  );
}
