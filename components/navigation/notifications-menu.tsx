"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Notification = { id: string; candidate_id: string | null; place_id: string | null; type: string; title: string; body: string | null; is_read: boolean; created_at: string };

export function NotificationsMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRecipientId(null); setNotifications([]); return; }
    setRecipientId(user.id);
    const { data } = await (supabase as any).from("user_notifications").select("id,candidate_id,place_id,type,title,body,is_read,created_at").order("created_at", { ascending: false }).limit(12);
    setNotifications((data ?? []) as Notification[]);
  };
  useEffect(() => { void load(); const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); }); return () => subscription.unsubscribe(); }, []);
  useEffect(() => {
    if (!recipientId) return;
    const channel = supabase.channel(`user-notifications:${recipientId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `recipient_id=eq.${recipientId}` }, (payload) => {
      const notification = payload.new as Notification;
      setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 12));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [recipientId]);
  const unread = notifications.filter((item) => !item.is_read).length;
  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) await (supabase as any).from("user_notifications").update({ is_read: true }).eq("id", notification.id);
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
    onOpenChange(false);
    router.push(notification.place_id ? "/admin/locations#unpublished" : `/curation/locations${notification.candidate_id ? `?request=${notification.candidate_id}` : ""}`);
  };
  return <div className="relative"><button type="button" aria-label="Notifications" onClick={() => { onOpenChange(!open); if (!open) void load(); }} className="relative rounded-full p-2 hover:bg-accent"><Bell className="h-5 w-5 text-muted-foreground" />{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950">{unread > 9 ? "9+" : unread}</span>}</button>{open && <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card text-sm shadow-xl"><div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-medium text-foreground">Notifications</p>{unread === 0 && <CheckCheck className="h-4 w-4 text-cyan-300" />}</div><div className="max-h-96 overflow-y-auto">{notifications.map((notification) => <button key={notification.id} type="button" onClick={() => void openNotification(notification)} className={`block w-full border-b border-border/60 px-4 py-3 text-left transition hover:bg-accent ${notification.is_read ? "" : "bg-cyan-400/5"}`}><p className="font-medium text-foreground">{notification.title}</p>{notification.body && <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>}</button>)}{notifications.length === 0 && <p className="p-4 text-muted-foreground">You&apos;re all caught up.</p>}</div></div>}</div>;
}
