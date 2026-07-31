import { NextRequest, NextResponse } from "next/server";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=4&timezone=auto`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error("Weather provider unavailable");
    const data = await response.json();
    return NextResponse.json({ current: data.current ?? null, daily: data.daily ?? null });
  } catch { return NextResponse.json({ error: "Weather is unavailable right now." }, { status: 502 }); }
}
