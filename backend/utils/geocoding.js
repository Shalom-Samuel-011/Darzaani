let nextRequestAt = 0;

async function geocodeAddress({ street, city, state, pincode }) {
    // Share a single serialized queue so branch creation and customer checkout
    // respect Nominatim's public-service request rate together.
    const now = Date.now();
    const scheduledAt = Math.max(now, nextRequestAt);
    nextRequestAt = scheduledAt + 1000;
    if (scheduledAt > now) await new Promise((resolve) => setTimeout(resolve, scheduledAt - now));

    const query = [street, city, state, pincode, "India"].filter(Boolean).join(", ");
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "in" }).toString();
    const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Darzaani/1.0 (address-based atelier routing)" },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Geocoding service returned ${response.status}`);
    const results = await response.json();
    if (!Array.isArray(results) || !results.length) return null;
    const longitude = Number(results[0].lon);
    const latitude = Number(results[0].lat);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    return [longitude, latitude];
}

module.exports = geocodeAddress;
