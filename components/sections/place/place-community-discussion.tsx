"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Heart, ImagePlus, MessageCircle, Pencil, Send, Star, Trash2, X } from "lucide-react";

import { createCommunityTip, createTipComment, deleteCommunityTip, deleteTipComment, reportCommunityTip, toggleTipVote, updateCommunityTip } from "@/app/actions/community";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { AppModal } from "@/components/ui/app-modal";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; userId: string; content: string; createdAt: string };
type Discussion = { id: string; userId: string; content: string; createdAt: string; rating: number | null; imageUrl: string | null; votes: number; likedByMe: boolean; comments: Comment[] };

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));

function RatingStars({ rating, onChange }: { rating: number; onChange?: (rating: number) => void }) {
  return <div className="flex items-center gap-1" aria-label={onChange ? "Optional star rating" : `${rating} star rating`}>
    {[1, 2, 3, 4, 5].map((value) => onChange ? <button key={value} type="button" onClick={() => onChange(value === rating ? 0 : value)} className="rounded p-1 text-amber-300 transition hover:bg-amber-300/10" aria-label={`${value} star${value === 1 ? "" : "s"}`}><Star className={`h-5 w-5 ${value <= rating ? "fill-current" : ""}`} /></button> : <Star key={value} className={`h-4 w-4 ${value <= rating ? "fill-current text-amber-300" : "text-slate-700"}`} />)}
  </div>;
}

export function PlaceCommunityDiscussion({ placeSlug, placeName }: { placeSlug: string; placeName: string }) {
  const { requireAuth } = useAuthModal();
  const [placeId, setPlaceId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [draft, setDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reportTarget, setReportTarget] = useState<Discussion | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const [{ data: place }, { data: userResult }] = await Promise.all([
      supabase.from("places").select("id").eq("slug", placeSlug).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    setUserId(userResult.user?.id ?? null);
    if (userResult.user) {
      const { data: role } = await supabase.from("curator_roles").select("role").eq("user_id", userResult.user.id).maybeSingle();
      setIsAdmin(role?.role === "admin");
    } else setIsAdmin(false);
    if (!place) { setPlaceId(""); setDiscussions([]); setIsLoading(false); return; }
    setPlaceId(place.id);
    const { data: tips } = await supabase.from("community_tips").select("id,user_id,content,created_at,rating,image_url").eq("place_id", place.id).order("created_at", { ascending: false });
    const ids = (tips ?? []).map((tip) => tip.id);
    if (!ids.length) { setDiscussions([]); setIsLoading(false); return; }
    const [{ data: votes }, { data: comments }] = await Promise.all([
      supabase.from("community_tip_votes").select("tip_id,user_id").in("tip_id", ids),
      supabase.from("community_tip_comments").select("id,tip_id,user_id,content,created_at").in("tip_id", ids).order("created_at"),
    ]);
    const voteMap = new Map<string, { count: number; mine: boolean }>();
    (votes ?? []).forEach((vote) => { const current = voteMap.get(vote.tip_id) ?? { count: 0, mine: false }; current.count += 1; current.mine ||= vote.user_id === userResult.user?.id; voteMap.set(vote.tip_id, current); });
    const commentMap = new Map<string, Comment[]>();
    (comments ?? []).forEach((comment) => commentMap.set(comment.tip_id, [...(commentMap.get(comment.tip_id) ?? []), { id: comment.id, userId: comment.user_id, content: comment.content, createdAt: comment.created_at ?? "" }]));
    setDiscussions((tips ?? []).map((tip) => ({ id: tip.id, userId: tip.user_id, content: tip.content, createdAt: tip.created_at ?? "", rating: tip.rating === null ? null : Number(tip.rating), imageUrl: tip.image_url, votes: voteMap.get(tip.id)?.count ?? 0, likedByMe: voteMap.get(tip.id)?.mine ?? false, comments: commentMap.get(tip.id) ?? [] })));
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [placeSlug]);
  const run = async (action: () => Promise<void>, fallback: string) => { try { await action(); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : fallback); } };
  const post = async () => { if (!draft.trim() || !placeId) return; if (!await requireAuth(post)) return; await run(async () => { await createCommunityTip(placeId, draft, rating || null, imageUrl || null); setDraft(""); setRating(0); setImageUrl(""); }, "Unable to share your review."); };
  const vote = async (tip: Discussion) => { const action = () => run(() => toggleTipVote(tip.id, !tip.likedByMe), "Unable to update like."); if (!await requireAuth(action)) return; await action(); };
  const reply = async (tip: Discussion) => { const content = replies[tip.id]?.trim(); if (!content) return; const action = () => run(async () => { await createTipComment(tip.id, content); setReplies((value) => ({ ...value, [tip.id]: "" })); }, "Unable to post reply."); if (!await requireAuth(action)) return; await action(); };
  const submitEdit = async (tip: Discussion) => { if (!editText.trim()) return; await run(async () => { await updateCommunityTip(tip.id, editText); setEditing(null); }, "Unable to update your review."); };
  const submitReport = async () => { if (!reportTarget || !reportReason.trim()) return; const action = () => run(async () => { await reportCommunityTip(reportTarget.id, reportReason); setReportTarget(null); setReportReason(""); }, "Unable to report this review."); if (!await requireAuth(action)) return; await action(); };
  const uploadImage = async (file?: File) => {
    if (!file) return;
    const action = async () => {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 5 * 1024 * 1024) { setMessage("Choose a PNG, JPEG, or WebP image under 5 MB."); return; }
      const { data: userResult } = await supabase.auth.getUser();
      if (!userResult.user) return;
      setIsUploading(true);
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${userResult.user.id}/${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("review-images").upload(path, file);
      if (error) setMessage(error.message);
      else { const { data } = supabase.storage.from("review-images").getPublicUrl(path); setImageUrl(data.publicUrl); }
      setIsUploading(false);
    };
    if (!await requireAuth(action)) return;
    await action();
  };

  return <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MessageCircle className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Community discussion</h2><p className="mt-1 text-sm text-slate-400">Reviews, tips, and replies specifically about {placeName}. These also appear in the main Community feed.</p></div></div>
    <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/50 p-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Share a helpful tip about ${placeName}…`} className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><RatingStars rating={rating} onChange={setRating} /><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"><ImagePlus className="h-4 w-4 text-cyan-300" />{isUploading ? "Uploading…" : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} className="sr-only" /></label></div>{imageUrl && <div className="relative mt-3 w-fit"><img src={imageUrl} alt="Review upload preview" className="h-24 w-32 rounded-lg object-cover" /><button type="button" onClick={() => setImageUrl("")} className="absolute -right-2 -top-2 rounded-full bg-slate-950 p-1 text-slate-200"><X className="h-3.5 w-3.5" /></button></div>}<div className="mt-3 flex justify-end"><button type="button" disabled={!draft.trim() || isUploading} onClick={() => void post()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"><Send className="h-4 w-4" />Post review</button></div></div>
    {message && <p className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
    <div className="mt-5 space-y-4">{isLoading && <p className="text-sm text-slate-400">Loading community discussion…</p>}{!isLoading && discussions.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Be the first to share a helpful review of {placeName}.</p>}{discussions.map((tip) => <article key={tip.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{tip.userId === userId ? "You" : "TravelAdvisor traveller"}</p><p className="mt-1 text-xs text-slate-500">Shared {formatDate(tip.createdAt)}</p></div>{tip.userId === userId ? <div className="flex gap-1"><button type="button" aria-label="Edit your review" onClick={() => { setEditing(tip.id); setEditText(tip.content); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete your review" onClick={() => void run(() => deleteCommunityTip(tip.id), "Unable to delete your review.")} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div> : isAdmin ? <button type="button" aria-label="Delete review as admin" onClick={() => void run(() => deleteCommunityTip(tip.id), "Unable to delete this review.")} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button> : <button type="button" aria-label="Report review" onClick={() => { setReportTarget(tip); setReportReason(""); }} className="rounded-lg p-2 text-amber-200 hover:bg-amber-500/10"><Flag className="h-4 w-4" /></button>}</div>{tip.rating && <div className="mt-3 flex items-center gap-2"><RatingStars rating={tip.rating} /><span className="text-xs text-slate-400">{tip.rating.toFixed(1)}</span></div>}{editing === tip.id ? <><textarea value={editText} onChange={(event) => setEditText(event.target.value)} className="mt-4 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => void submitEdit(tip)} className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950">Save</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Cancel</button></div></> : <p className="mt-4 text-sm leading-6 text-slate-200">{tip.content}</p>}{tip.imageUrl && <img src={tip.imageUrl} alt="Photo shared with this review" className="mt-4 max-h-96 w-full rounded-xl object-cover" loading="lazy" />}<div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void vote(tip)} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"><Heart className={`h-4 w-4 ${tip.likedByMe ? "fill-red-400 text-red-400" : ""}`} />{tip.votes}</button><span className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-slate-400"><MessageCircle className="h-4 w-4" />{tip.comments.length} replies</span></div>{tip.comments.length > 0 && <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">{tip.comments.map((comment) => <div key={comment.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-900 p-3"><div><Link href={`/place/${placeSlug}`} aria-label={`Open ${placeName}`} className="rounded text-sm text-slate-300 transition hover:text-cyan-300 hover:underline">{comment.content}</Link><p className="mt-1 text-xs text-slate-500">{comment.userId === userId ? "You" : "Traveller"} · {formatDate(comment.createdAt)}</p></div>{(comment.userId === userId || isAdmin) && <button type="button" aria-label="Delete your reply" onClick={() => void run(() => deleteTipComment(comment.id), "Unable to delete reply.")} className="text-red-300"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}<div className="mt-4 flex gap-2"><input value={replies[tip.id] ?? ""} onChange={(event) => setReplies((value) => ({ ...value, [tip.id]: event.target.value }))} placeholder="Reply to this review…" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /><button type="button" onClick={() => void reply(tip)} className="rounded-lg bg-slate-800 px-3 text-cyan-200 hover:bg-slate-700"><Send className="h-4 w-4" /></button></div></article>)}</div>
    <AppModal open={Boolean(reportTarget)} onOpenChange={(open) => { if (!open) setReportTarget(null); }} ariaLabel="Report community review"><h2 className="text-xl font-semibold">Report review</h2><p className="mt-2 text-sm text-slate-400">Tell us why this place-specific review should be checked.</p><textarea autoFocus value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Write your reason…" className="mt-5 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /><button type="button" disabled={!reportReason.trim()} onClick={() => void submitReport()} className="mt-4 w-full rounded-lg bg-cyan-400 p-3 font-medium text-slate-950 disabled:opacity-50">Submit report</button></AppModal>
  </section>;
}
