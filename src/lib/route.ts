import { haversineDistanceKm } from "./geo";
import { Coordinates, Store } from "./types";

export function nearestNeighborOrder(
  start: Coordinates,
  stores: Store[]
): Store[] {
  const remaining = [...stores];
  const ordered: Store[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((store, index) => {
      const distance = haversineDistanceKm(current, store.coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [nearestStore] = remaining.splice(nearestIndex, 1);
    ordered.push(nearestStore);
    current = nearestStore.coordinates;
  }

  return ordered;
}

export function googleMapsRouteUrl(
  origin: Coordinates,
  orderedStops: Store[]
): string {
  if (orderedStops.length === 0) return "";

  const destination = orderedStops[orderedStops.length - 1];
  const waypoints = orderedStops.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.coordinates.lat},${destination.coordinates.lng}`,
    travelmode: "driving",
  });

  if (waypoints.length > 0) {
    params.set(
      "waypoints",
      waypoints.map((store) => `${store.coordinates.lat},${store.coordinates.lng}`).join("|")
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
