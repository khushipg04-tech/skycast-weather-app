# Working with REST APIs — Assignment Report

**Project:** SkyCast — a live weather dashboard built with React
**Public API used:** [Open-Meteo](https://open-meteo.com/) (free, no API key required — a drop-in
alternative to OpenWeatherMap)

---

## 1. What is a REST API and why it matters

A REST API exposes data as **resources** reachable over HTTP URLs. A client sends a request with a
method (`GET`, `POST`, `PUT`, `DELETE`), the server answers with a status code and a body — almost
always JSON.

Key properties that make REST the backbone of modern apps:

| Property | Meaning | Why it matters |
| --- | --- | --- |
| Stateless | Every request carries all context it needs | Servers scale horizontally |
| Uniform interface | Same verbs and URL rules everywhere | Any client (web, mobile, IoT) can consume it |
| Resource oriented | `/v1/forecast`, `/v1/search` | Predictable, self-documenting |
| Cacheable | Responses can be reused | Fewer calls, faster UI, lower cost |
| Client–server split | UI and data evolve separately | One backend, many frontends |

## 2. The endpoints integrated

**Geocoding — turn a city name into coordinates**

```
GET https://geocoding-api.open-meteo.com/v1/search?name=Kolkata&count=5&language=en&format=json
```

```json
{
  "results": [
    {
      "id": 1275004,
      "name": "Kolkata",
      "latitude": 22.5697,
      "longitude": 88.3697,
      "country": "India",
      "admin1": "West Bengal"
    }
  ]
}
```

**Forecast — current conditions, hourly and 7-day data**

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=22.5697&longitude=88.3697
    &current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,is_day,weather_code
    &hourly=temperature_2m,weather_code
    &daily=weather_code,temperature_2m_max,temperature_2m_min
    &timezone=auto&forecast_days=7
```

```json
{
  "current": { "temperature_2m": 31.4, "relative_humidity_2m": 78, "weather_code": 2, "is_day": 1 },
  "hourly": { "time": ["2026-09-05T00:00"], "temperature_2m": [30.1], "weather_code": [3] },
  "daily": { "time": ["2026-09-05"], "temperature_2m_max": [33.2], "temperature_2m_min": [27.0] }
}
```

## 3. Making the request and handling JSON

A single typed helper centralises the `GET` request, the status check and the JSON parse, so every
call fails loudly instead of silently returning `undefined` (`src/lib/weather.ts`):

```ts
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}
```

The raw API shape is **column-oriented** (parallel arrays). The app normalises it into an array of
objects, which is what a UI list actually wants:

```ts
const hourly = data.hourly.time
  .map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[i]!,
    code: data.hourly.weather_code[i]!,
  }))
  .filter((h) => new Date(h.time).getTime() >= Date.now() - 60 * 60 * 1000)
  .slice(0, 12);
```

Numeric `weather_code` values are mapped to human text and icons instead of being shown raw:

```ts
export const WEATHER_CODES: Record<number, string> = { 0: "Clear sky", 3: "Overcast", 61: "Light rain" /* … */ };
export const describeCode = (code: number) => WEATHER_CODES[code] ?? "Unknown";
```

## 4. Presenting the data in React

TanStack Query handles the request lifecycle — caching, de-duplication, loading and error flags
(`src/routes/index.tsx`):

```tsx
const weather = useQuery({
  queryKey: ["weather", place.latitude, place.longitude],
  queryFn: () => fetchWeather(place),
  staleTime: 5 * 60 * 1000, // cached for 5 minutes: fewer network calls
});
```

Search input is **debounced by 350 ms** so typing "Kolkata" fires one geocoding request instead of
seven:

```tsx
const debouncedQuery = useDebounced(query);
const suggestions = useQuery({
  queryKey: ["places", debouncedQuery],
  queryFn: () => searchPlaces(debouncedQuery),
  enabled: debouncedQuery.trim().length >= 2, // no request for 0–1 characters
});
```

Three UI states are always rendered explicitly:

```tsx
{weather.isPending && <p>Fetching live weather…</p>}
{weather.isError && <p>Couldn't load the weather right now. Please try again.</p>}
{weather.data && <Dashboard data={weather.data} />}
```

The dashboard shows temperature and "feels like", wind, humidity, precipitation, the next 12 hours
as a scrollable strip, and a 7-day forecast list with icons.

## 5. Case studies / industry applications

- **Stripe (payments):** every charge, refund and subscription is a REST resource. Businesses
  integrate global payments in days instead of building bank connections.
- **Google Maps Platform (logistics):** delivery apps call geocoding and directions endpoints for
  routing, saving fuel and delivery time without owning map data.
- **Twilio (communications):** one `POST` sends an SMS or OTP worldwide; telecom complexity stays
  behind the API.
- **Open-Meteo / OpenWeatherMap (this project):** agriculture, aviation and travel apps read the
  same forecast endpoints to drive irrigation alerts, flight planning and trip suggestions.

## 6. Benefits observed while building

1. **Speed** — a full weather product with zero backend code and zero data collection.
2. **Separation of concerns** — all API logic lives in `src/lib/weather.ts`; components stay
   presentational, so switching provider touches one file.
3. **Type safety** — typed response shapes catch field-name mistakes at compile time.
4. **Resilience** — explicit status checks plus loading/error states mean an outage degrades the UI
   instead of crashing it.
5. **Efficiency** — debouncing and a 5-minute cache cut request volume sharply, which matters on
   rate-limited or paid plans.

## 7. Conclusion

REST APIs let a small client application deliver real, continuously updated value. The pattern used
here — a thin typed fetch layer, normalise JSON at the boundary, cache and debounce, then render
loading / error / success explicitly — generalises to any public or private REST API.
