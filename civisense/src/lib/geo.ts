import { BOJONGSOANG_BOUNDS, MAP_MAX_BOUNDS } from "@/lib/constants";

export function isWithinBojongsoangBounds(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= BOJONGSOANG_BOUNDS.south &&
    latitude <= BOJONGSOANG_BOUNDS.north &&
    longitude >= BOJONGSOANG_BOUNDS.west &&
    longitude <= BOJONGSOANG_BOUNDS.east
  );
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
