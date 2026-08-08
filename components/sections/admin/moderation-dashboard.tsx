"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Activity, ClipboardCheck, Flag, MapPinned, MapPin, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

import { deleteCommunityTip, deleteTipComment } from "@/app/actions/community";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

type ReportedTip = { id: string; reason: string; created_at: string; community_tips: { id: string; content: string; places: { name: string; slug: string } | null } | null };
type ReportedComment = { id: string; reason: string; created_at: string; community_tip_comments: { id: string; content: string; community_tips: { places: { name: string; slug: string } | null } | null } | null };
type DeleteTarget = { type: "tip" | "comment"; id: string; label: string };
const date = (value: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

const adminActions = [
  { href: "/admin/locations", title: "Manage published locations", description: "Edit, unpublish, or restore catalogue records.", icon: MapPin },
  { href: "/admin/data-quality", title: "Catalogue integrity", description: "Find missing images, coordinates, and destination links.", icon: ClipboardCheck },
  { href: "/admin/google-matches", title: "Google place matches", description: "Link catalogue records to their exact Google Maps place.", icon: MapPinned },
  { href: "/admin/activity", title: "View activity logs", description: "Review permanent administrative history.", icon: Activity },
];

export function ModerationDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tipReports, setTipReports] = useState<ReportedTip[]>([]);
  const [commentReports, setCommentReports] = useState<ReportedComment[]>([]);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    setMessage("");
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const allowed = role?.role === "admin"; setIsAdmin(allowed); if (!allowed) return;
    const [{ data: tips, error: tipError }, { data: comments, error: commentError }] = await Promise.all([
      supabase.from("community_tip_reports").select("id,reason,created_at,community_tips(id,content,places(name,slug))").order("created_at", { ascending: false }),
      supabase.from("community_comment_reports").select("id,reason,created_at,community_tip_comments(id,content,community_tips(places(name,slug)))").order("created_at", { ascending: false }),
    ]);
    if (tipError || commentError) setMessage(tipError?.message ?? commentError?.message ?? "Unable to load reports.");
    setTipReports((tips ?? []) as unknown as ReportedTip[]); setCommentReports((comments ?? []) as unknown as ReportedComment[]);
  };
  useEffect(() => { void load(); }, []);
  const remove = async () => { if (!deleteTarget) return; setIsDeleting(true); try { if (deleteTarget.type === "tip") await deleteCommunityTip(deleteTarget.id); else await deleteTipComment(deleteTarget.id); setDeleteTarget(null); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove this content."); } finally { setIsDeleting(false); } };

  if (isAdmin === false) return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-3xl px-4 py-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1><p className="mt-3 text-muted-foreground">This workspace is available only to the TravelAdvisor administrator.</p></section><Footer /></main>;
  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-400">Admin workspace</p><h1 className="mt-1 text-4xl font-bold">Moderation</h1><p className="mt-2 text-muted-foreground">Review reported community content and manage catalogue integrity from one place.</p></div><button type="button" onClick={() => void load()} className="rounded-xl border border-border bg-card p-3 text-cyan-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/10" aria-label="Refresh moderation queue"><RefreshCw className="h-4 w-4" /></button></div><div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{adminActions.map((action) => { const Icon = action.icon; return <Link key={action.href} href={action.href} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-lg"><span className="inline-flex rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><Icon className="h-4 w-4" /></span><h2 className="mt-3 font-semibold group-hover:text-cyan-300">{action.title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{action.description}</p><span className="mt-3 inline-block text-sm font-medium text-cyan-400">Open workspace →</span></Link>; })}</div>{message && <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}<div className="mt-9 grid gap-6 lg:grid-cols-2"><ReportList title="Reported place posts" empty="No reported posts." icon={<Flag className="h-5 w-5" />}>{tipReports.map((report) => { const tip = report.community_tips; const place = tip?.places; if (!tip) return null; return <article key={report.id} className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Reported {date(report.created_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm">{tip.content}</p>{place && <Link href={`/place/${place.slug}`} className="mt-3 inline-block text-sm text-cyan-400 hover:underline">Open {place.name}</Link>}<p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-200"><span className="font-medium">Reason: </span>{report.reason}</p><button type="button" onClick={() => setDeleteTarget({ type: "tip", id: tip.id, label: "this place post and its replies" })} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Remove post</button></article>; })}</ReportList><ReportList title="Reported replies" empty="No reported replies." icon={<Flag className="h-5 w-5" />}>{commentReports.map((report) => { const comment = report.community_tip_comments; const place = comment?.community_tips?.places; if (!comment) return null; return <article key={report.id} className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Reported {date(report.created_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm">{comment.content}</p>{place && <Link href={`/place/${place.slug}`} className="mt-3 inline-block text-sm text-cyan-400 hover:underline">Open {place.name}</Link>}<p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-200"><span className="font-medium">Reason: </span>{report.reason}</p><button type="button" onClick={() => setDeleteTarget({ type: "comment", id: comment.id, label: "this reply" })} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Remove reply</button></article>; })}</ReportList></div></section><AppModal open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} ariaLabel="Confirm removal" className="border-red-500/30"><h2 className="text-xl font-semibold text-red-300">Remove {deleteTarget?.label}?</h2><p className="mt-3 text-sm text-muted-foreground">This is permanent and removes the reported content from the public site.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-border px-4 py-2">Cancel</button><button type="button" disabled={isDeleting} onClick={() => void remove()} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white disabled:opacity-50">{isDeleting ? "Removing…" : "Remove"}</button></div></AppModal><Footer /></main>;
}

function ReportList({ title, empty, icon, children }: { title: string; empty: string; icon: ReactNode; children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return <section><h2 className="flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2><div className="mt-4 space-y-3">{items.length ? items : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">{empty}</p>}</div></section>;
}
