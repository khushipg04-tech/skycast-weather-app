import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Droplets, Loader2, MapPin, Search, Thermometer, Wind } from "lucide-react";

import { WeatherIcon } from "@/components/WeatherIcon";
import {
  DEFAULT_PLACE,
  describeCode,
  fetchWeather,
  searchPlaces,
  type GeoPlace,
} from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkyCast — Live Weather Dashboard in React" },
      {
        name: "description",
        content:
          "Search any city and see live temperature, hourly trends and a 7-day forecast, fetched from a public weather API.",
      },
      { property: "og:title", content: "SkyCast — Live Weather Dashboard in React" },
      {
        property: "og:description",
        content:
          "Search any city and see live temperature, hourly trends and a 7-day forecast, fetched from a public weather API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Index() {
  const [place, setPlace] = useState<GeoPlace>(DEFAULT_PLACE);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounced(query);

  const suggestions = useQuery({
    queryKey: ["places", debouncedQuery],
    queryFn: () => searchPlaces(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const weather = useQuery({
    queryKey: ["weather", place.latitude, place.longitude],
    queryFn: () => fetchWeather(place),
    staleTime: 5 * 60 * 1000,
  });

  const data = weather.data;

  return (
    <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-5 py-10 sm:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            React + Public API
          </p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">SkyCast</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Live weather fetched from the Open-Meteo public API — search a city to see current
            conditions, the next hours and the week ahead.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <label htmlFor="city" className="sr-only">
            Search a city
          </label>
          <div className="glass flex items-center gap-2 rounded-full px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id="city"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search a city…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {suggestions.isFetching && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          {open && (suggestions.data?.length ?? 0) > 0 && (
            <ul className="glass absolute z-20 mt-2 w-full overflow-hidden rounded-2xl p-1">
              {suggestions.data!.map((p) => (
                <li key={`${p.id}-${p.latitude}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlace(p);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <MapPin className="size-4 text-accent" aria-hidden="true" />
                    <span>
                      {p.name}
                      <span className="text-muted-foreground">
                        {p.admin1 ? `, ${p.admin1}` : ""} {p.country ? `· ${p.country}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {weather.isError && (
        <p className="glass mt-10 rounded-2xl p-6 text-sm text-destructive">
          Couldn't load the weather right now. Please check your connection and try again.
        </p>
      )}

      {weather.isPending && (
        <div className="glass mt-10 flex items-center gap-3 rounded-3xl p-10 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Fetching live weather…
        </div>
      )}

      {data && (
        <div className="mt-10 grid gap-5">
          <section className="glass grid gap-8 rounded-3xl p-7 sm:grid-cols-[1.2fr_1fr] sm:p-9">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 text-accent" aria-hidden="true" />
                {data.place.name}
                {data.place.country ? `, ${data.place.country}` : ""}
              </p>
              <div className="mt-4 flex items-center gap-5">
                <WeatherIcon
                  code={data.current.code}
                  isDay={data.current.isDay}
                  className="size-16 text-primary"
                />
                <div>
                  <p className="font-display text-6xl font-semibold leading-none">
                    {Math.round(data.current.temperature)}°
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {describeCode(data.current.code)} · feels like{" "}
                    {Math.round(data.current.apparent)}°
                  </p>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 self-center">
              <Stat
                icon={<Wind className="size-4" aria-hidden="true" />}
                label="Wind"
                value={`${Math.round(data.current.wind)} km/h`}
              />
              <Stat
                icon={<Droplets className="size-4" aria-hidden="true" />}
                label="Humidity"
                value={`${data.current.humidity}%`}
              />
              <Stat
                icon={<Thermometer className="size-4" aria-hidden="true" />}
                label="Rain"
                value={`${data.current.precipitation} mm`}
              />
            </dl>
          </section>

          <section className="glass rounded-3xl p-6 sm:p-7">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Next hours
            </h2>
            <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {data.hourly.map((h) => (
                <li
                  key={h.time}
                  className="flex min-w-20 flex-col items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-4"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.time).toLocaleTimeString([], { hour: "numeric" })}
                  </span>
                  <WeatherIcon code={h.code} className="size-6 text-accent" />
                  <span className="text-sm font-semibold">{Math.round(h.temperature)}°</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-3xl p-6 sm:p-7">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              7-day forecast
            </h2>
            <ul className="mt-4 divide-y divide-border">
              {data.daily.map((d) => (
                <li key={d.date} className="flex items-center gap-4 py-3">
                  <span className="w-14 text-sm font-medium">
                    {new Date(d.date).toLocaleDateString([], { weekday: "short" })}
                  </span>
                  <WeatherIcon code={d.code} className="size-5 text-accent" />
                  <span className="flex-1 text-sm text-muted-foreground">
                    {describeCode(d.code)}
                  </span>
                  <span className="text-sm text-muted-foreground">{Math.round(d.min)}°</span>
                  <span className="w-10 text-right text-sm font-semibold">
                    {Math.round(d.max)}°
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-4 text-center">
      <dt className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
