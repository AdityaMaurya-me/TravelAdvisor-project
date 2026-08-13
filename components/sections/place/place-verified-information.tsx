import { ExternalLink, Info, Phone, Ticket } from "lucide-react";

import type { PlaceDetail } from "@/lib/mock-data/places";

type OpeningDay = { closed?: boolean; open?: string; close?: string };

function formatTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function formatOpeningHours(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Record<string, OpeningDay>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [value];
    return Object.entries(parsed).map(([day, hours]) => `${day}: ${hours?.closed ? "Closed" : hours?.open && hours?.close ? `${formatTime(hours.open)} – ${formatTime(hours.close)}` : "Hours not listed"}`);
  } catch {
    return [value];
  }
}

export function PlaceVerifiedInformation({ info }: { info: PlaceDetail["verifiedInfo"] }) {
  const verifiedDate = info.lastVerifiedAt ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(info.lastVerifiedAt)) : null;
  const openingHours = formatOpeningHours(info.openingHours);
  const facilities = [["Parking", info.hasParking], ["Washroom", info.hasWashroom], ["Pet friendly", info.isPetFriendly], ["EV charging", info.hasEvCharging]].filter(([, value]) => value !== null && value !== undefined) as Array<[string, boolean]>;
  return <section className="rounded-2xl border border-border/60 bg-card/60 p-5"><div className="flex items-center gap-2"><Info className="h-5 w-5 text-cyan-300" /><h2 className="font-semibold">Verified place information</h2></div><div className="mt-4 space-y-3 text-sm">{openingHours.length > 0 && <div><p className="text-muted-foreground">Opening hours</p><ul className="mt-1 space-y-1 text-foreground/90">{openingHours.map((hours) => <li key={hours}>{hours}</li>)}</ul></div>}{info.entryFee && <p className="flex gap-2"><Ticket className="mt-0.5 h-4 w-4 text-amber-400" /><span>{info.entryFee}</span></p>}{info.typicalVisitMinutes != null && <p><span className="text-muted-foreground">Typical visit: </span>about {info.typicalVisitMinutes} minutes</p>}{info.phone && <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 text-cyan-300" /><a href={`tel:${info.phone}`} className="hover:text-cyan-200">{info.phone}</a></p>}{facilities.length > 0 && <div className="flex flex-wrap gap-2">{facilities.map(([label, value]) => <span key={label} className={`rounded-full px-2 py-1 text-xs ${value ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-800 text-slate-400"}`}>{label}: {value ? "Yes" : "No"}</span>)}</div>}{info.websiteUrl && <a href={info.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><ExternalLink className="h-4 w-4" />Official website</a>}{info.sourceUrl && <a href={info.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><ExternalLink className="h-4 w-4" />Source reference</a>}{info.sourceReference && <p className="text-xs text-muted-foreground">Source: {info.sourceReference}</p>}{verifiedDate && <p className="text-xs text-muted-foreground">Last verified: {verifiedDate}</p>}</div></section>;
}
