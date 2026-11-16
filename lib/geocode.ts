// Reverse geocoding with OpenStreetMap Nominatim (free, no key). Client-side, one call per pin move.
export type Place = { area: string; address: string };

export async function reverseGeocodeFull(lat: number, lng: number): Promise<Place | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { display_name?: string; address?: Record<string, string> };
    const a = j.address ?? {};
    const area = a.suburb || a.neighbourhood || a.city_district || a.quarter || a.village || a.town || a.city || a.county || "";
    // trim the country/postcode noise from the tail of display_name, keep the street-level part
    const address = (j.display_name ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && p !== a.country && p !== a.country_code?.toUpperCase())
      .join(", ");
    return area || address ? { area, address } : null;
  } catch {
    return null;
  }
}
