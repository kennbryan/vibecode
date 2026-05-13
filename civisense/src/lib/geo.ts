import { BOJONGSOANG_BOUNDS, MAP_MAX_BOUNDS } from "@/lib/constants";
import { BOJONGSOANG_POLYGON } from "@/lib/bojongsoang-polygon";

export function isWithinBojongsoangBounds(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  // Ray casting point-in-polygon
  let inside = false;
  for (let i = 0, j = BOJONGSOANG_POLYGON.length - 1; i < BOJONGSOANG_POLYGON.length; j = i++) {
    const [yi, xi] = BOJONGSOANG_POLYGON[i];
    const [yj, xj] = BOJONGSOANG_POLYGON[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function parseCoordinate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return Number.NaN;
  }

  return Number.parseFloat(value);
}

export function boundsAsLeafletTuple(): [[number, number], [number, number]] {
  return [
    [BOJONGSOANG_BOUNDS.south, BOJONGSOANG_BOUNDS.west],
    [BOJONGSOANG_BOUNDS.north, BOJONGSOANG_BOUNDS.east],
  ];
}

export function maxBoundsAsLeafletTuple(): [[number, number], [number, number]] {
  return [
    [MAP_MAX_BOUNDS.south, MAP_MAX_BOUNDS.west],
    [MAP_MAX_BOUNDS.north, MAP_MAX_BOUNDS.east],
  ];
}
