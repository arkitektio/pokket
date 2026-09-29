/**
 * Place names from a reverse geocoder, only if the user set one (ideally
 * their own Photon), and only when they ask for a suggestion. The system
 * geocoder (`Location.reverseGeocodeAsync`) is never used: it would hand the
 * coordinates to Apple or Google.
 */
type PhotonFeature = {
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; district?: string };
};

export const suggestPlaceName = async (baseUrl: string, at: { lat: number; lon: number }): Promise<string | null> => {
  const url = `${baseUrl.replace(/\/+$/, "")}/reverse?lat=${at.lat}&lon=${at.lon}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoder answered ${response.status}`);
  const body = (await response.json()) as { features?: PhotonFeature[] };
  const p = body.features?.[0]?.properties;
  if (!p) return null;
  const street = p.street ? [p.street, p.housenumber].filter(Boolean).join(" ") : null;
  return p.name ?? street ?? p.district ?? p.city ?? null;
};
