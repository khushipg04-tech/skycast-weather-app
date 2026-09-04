// Public API calls (Open-Meteo — no API key required)
export type GeoPlace = {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherData = {
  place: GeoPlace;
  current: {
    temperature: number;
    apparent: number;
    humidity: number;
    wind: number;
    precipitation: number;
    isDay: boolean;
    code: number;
  };
  hourly: { time: string; temperature: number; code: number }[];
  daily: { date: string; max: number; min: number; code: number }[];
};

export const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm, hail",
  99: "Thunderstorm, hail",
};

export function describeCode(code: number) {
  return WEATHER_CODES[code] ?? "Unknown";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function searchPlaces(query: string): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await getJson<{ results?: GeoPlace[] }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
  );
  return data.results ?? [];
}

type ForecastResponse = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    is_day: number;
    weather_code: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

export async function fetchWeather(place: GeoPlace): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,is_day,weather_code` +
    `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=7`;

  const data = await getJson<ForecastResponse>(url);

  const now = Date.now();
  const hourly = data.hourly.time
    .map((time, i) => ({
      time,
      temperature: data.hourly.temperature_2m[i]!,
      code: data.hourly.weather_code[i]!,
    }))
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 12);

  return {
    place,
    current: {
      temperature: data.current.temperature_2m,
      apparent: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      precipitation: data.current.precipitation,
      isDay: data.current.is_day === 1,
      code: data.current.weather_code,
    },
    hourly,
    daily: data.daily.time.map((date, i) => ({
      date,
      max: data.daily.temperature_2m_max[i]!,
      min: data.daily.temperature_2m_min[i]!,
      code: data.daily.weather_code[i]!,
    })),
  };
}

export const DEFAULT_PLACE: GeoPlace = {
  id: 1275004,
  name: "Kolkata",
  country: "India",
  admin1: "West Bengal",
  latitude: 22.5697,
  longitude: 88.3697,
};
