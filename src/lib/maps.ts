import { Coordinates } from "./types";

export function googleMapsUrl(coordinates: Coordinates, label?: string): string {
  const query = label
    ? `${label} @${coordinates.lat},${coordinates.lng}`
    : `${coordinates.lat},${coordinates.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
