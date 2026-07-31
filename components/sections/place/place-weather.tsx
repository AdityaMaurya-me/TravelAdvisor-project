"use client";

import { CloudRain, CloudSun, LoaderCircle, Wind } from "lucide-react";
import { useEffect, useState } from "react";

type Weather = { temperature_2m: number; apparent_temperature: number; precipitation: number; weather_code: number; wind_speed_10m: number };
type Forecast = { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
const description = (code: number) => code >= 95 ? "Thunderstorms" : code >= 80 ? "Rain showers" : code >= 61 ? "Rain" : code >= 45 ? "Foggy" : code >= 3 ? "Cloudy" : "Clear";

export function PlaceWeather({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { let active = true; fetch(`/api/weather?lat=${latitude}&lon=${longitude}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) { setWeather(data.current ?? null); setForecast(data.daily ?? null); } }).catch(() => { if (active) setUnavailable(true); }); return () => { active = false; }; }, [latitude, longitude]);
  if (unavailable) return null;
  return <section className="rounded-2xl border border-border/60 bg-card/60 p-5"><div className="flex items-center gap-2"><CloudSun className="h-5 w-5 text-cyan-300" /><h2 className="font-semibold">Current conditions</h2></div>{!weather ? <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading weather…</p> : <><div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-bold">{Math.round(weather.temperature_2m)}°C</p><p className="mt-1 text-sm text-muted-foreground">Feels like {Math.round(weather.apparent_temperature)}°C · {description(weather.weather_code)}</p></div><CloudRain className="h-8 w-8 text-cyan-300" /></div><div className="mt-4 flex gap-4 text-xs text-muted-foreground"><span>Rain {weather.precipitation} mm</span><span className="inline-flex items-center gap-1"><Wind className="h-3.5 w-3.5" />{Math.round(weather.wind_speed_10m)} km/h</span></div>{weather.weather_code >= 61 && <p className="mt-4 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">Wet conditions are reported. Check local safety guidance before an outdoor visit.</p>}{forecast?.time?.length ? <div className="mt-5 border-t border-border/70 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">4-day outlook</p><div className="mt-3 grid grid-cols-2 gap-2"><>{forecast.time.map((date, index) => <div key={date} className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs"><p className="font-medium">{index === 0 ? "Today" : new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${date}T12:00:00`))}</p><p className="mt-1 text-muted-foreground">{Math.round(forecast.temperature_2m_min[index])}–{Math.round(forecast.temperature_2m_max[index])}°</p><p className="mt-1 text-cyan-300">{description(forecast.weather_code[index])} · {forecast.precipitation_probability_max[index] ?? 0}%</p></div>)}</></div></div> : null}</>}</section>;
}
