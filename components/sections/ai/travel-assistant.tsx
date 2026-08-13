"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import {
  ArrowUp,
  Bot,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { AppModal } from "@/components/ui/app-modal";
import { ImageCard } from "@/components/ui/image-card";

type AssistantCard = {
  slug: string;
  title: string;
  href: string;
  location: string;
  image: string;
  description: string | null;
  type: "Destination" | "Place";
  source?: "TravelAdvisor" | "Google Maps";
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  cards?: AssistantCard[];
};

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
  ai_messages: Message[];
};

const ACTIVE_CONVERSATION_KEY = "traveladvisor:active-ai-conversation";
const starters = [
  "Plan a two-day weekend in Lonavala",
  "Which waterfalls can I explore near Pune?",
  "Suggest a budget-friendly Goa itinerary",
  "What can I do in Mumbai in one day?",
  "Find cafés and local food in Goa",
  "Plan a scenic Mumbai to Lonavala drive",
  "What are the best family-friendly places in Manali?",
  "Suggest a one-day heritage itinerary for Jaipur",
  "Which places are good for a monsoon trip?",
  "Help me plan a low-budget weekend trip from Pune",
  "Find quiet nature spots around Mumbai",
  "What should I pack for a hill-station trip?",
];

const STARTER_COUNT = 4;

function promptsForNewChat(seed: number) {
  const start = Math.abs(seed) % starters.length;
  return Array.from({ length: STARTER_COUNT }, (_, index) => starters[(start + index * 3) % starters.length]);
}

export function TravelAssistant() {
  const { requireAuth } = useAuthModal();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [chatPrompts, setChatPrompts] = useState<Record<string, string[]>>({});

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const messages = active?.ai_messages ?? [];

  const load = async () => {
    try {
      const response = await fetch("/api/ai/conversations");
      const result = (await response.json()) as { conversations?: Conversation[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load your previous chats.");
      const rows = result.conversations ?? [];
      const storedId = window.sessionStorage.getItem(ACTIVE_CONVERSATION_KEY);

      setConversations(rows);
      setActiveId((current) => {
        const preferredId = current ?? storedId;
        return rows.some((row) => row.id === preferredId) ? preferredId : rows[0]?.id ?? null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your previous chats.");
    } finally {
      setHistoryLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    if (activeId) window.sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
    else window.sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }, [activeId, historyLoaded]);

  const createConversation = async (): Promise<Conversation | null> => {
    const response = await fetch("/api/ai/conversations", { method: "POST" });
    const result = (await response.json()) as { conversation?: Conversation; error?: string };

    if (!result.conversation) {
      setError(result.error ?? "Could not create a new chat.");
      return null;
    }

    setConversations((current) => [result.conversation!, ...current]);
    setActiveId(result.conversation.id);
    setChatPrompts((current) => ({
      ...current,
      [result.conversation!.id]: promptsForNewChat(Date.now() + conversations.length),
    }));
    setError(null);
    return result.conversation;
  };

  const newChat = async () => {
    if (!(await requireAuth(() => void newChat()))) return;
    await createConversation();
  };

  const rename = async () => {
    const conversation = renameTarget;
    const title = renameTitle.trim();
    if (!conversation || !title || title === conversation.title) {
      setRenameTarget(null);
      return;
    }

    setIsManaging(true);
    const response = await fetch(`/api/ai/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      setError("Could not rename this chat.");
      setIsManaging(false);
      return;
    }

    setConversations((current) =>
      current.map((row) => (row.id === conversation.id ? { ...row, title } : row)),
    );
    setRenameTarget(null);
    setIsManaging(false);
  };

  const remove = async () => {
    const conversation = deleteTarget;
    if (!conversation) return;

    setIsManaging(true);
    const response = await fetch(`/api/ai/conversations/${conversation.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Could not delete this chat.");
      setIsManaging(false);
      return;
    }

    setConversations((current) => current.filter((row) => row.id !== conversation.id));
    if (activeId === conversation.id) setActiveId(null);
    setDeleteTarget(null);
    setIsManaging(false);
  };

  const ask = async (question: string, targetConversationId?: string) => {
    const content = question.trim();
    if (!content || isLoading) return;

    let conversationId = targetConversationId ?? activeId;
    if (!conversationId) {
      if (!(await requireAuth(() => void ask(content)))) return;
      const conversation = await createConversation();
      if (!conversation) return;
      conversationId = conversation.id;
    }

    const conversation = conversations.find((row) => row.id === conversationId);
    const currentMessages = conversation?.ai_messages ?? [];
    const optimistic = [...currentMessages, { role: "user" as const, content }];

    setConversations((current) =>
      current.map((row) =>
        row.id === conversationId ? { ...row, ai_messages: optimistic } : row,
      ),
    );
    setActiveId(conversationId);
    setDraft("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: optimistic, conversationId }),
      });
      const result = (await response.json()) as {
        answer?: string;
        cards?: AssistantCard[];
        error?: string;
        historyWarning?: string;
      };

      if (!response.ok || !result.answer) {
        throw new Error(result.error || "The assistant could not answer that right now.");
      }

      setConversations((current) => {
        const updatedConversation = current.find((row) => row.id === conversationId);
        if (!updatedConversation) return current;

        const updated = {
          ...updatedConversation,
          title: currentMessages.length === 0 ? content.slice(0, 80) : updatedConversation.title,
          updated_at: new Date().toISOString(),
          ai_messages: [
            ...optimistic,
            { role: "assistant" as const, content: result.answer!, cards: result.cards ?? [] },
          ],
        };

        return [updated, ...current.filter((row) => row.id !== conversationId)];
      });
      if (result.historyWarning) setError(result.historyWarning);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The assistant could not answer that right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(draft);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (draft.trim() && !isLoading) void ask(draft);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-border bg-background/60 p-4 lg:border-r lg:border-b-0">
        <button
          type="button"
          onClick={() => void newChat()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>

        <div className="mt-5 max-h-130 space-y-1 overflow-y-auto">
          {conversations.length ? (
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
              Chat history
            </p>
          ) : null}
          {historyLoaded && !conversations.length ? (
            <p className="px-2 text-sm leading-6 text-muted-foreground">
              Start a chat to keep your trip plans here.
            </p>
          ) : null}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-center gap-1 rounded-xl ${
                activeId === conversation.id ? "bg-violet-400/10" : "hover:bg-accent"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm"
                aria-current={activeId === conversation.id ? "page" : undefined}
                title={`Open ${conversation.title}`}
              >
                {conversation.title}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenameTarget(conversation);
                  setRenameTitle(conversation.title);
                }}
                className="p-1.5 text-muted-foreground opacity-100 transition hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
                aria-label={`Rename ${conversation.title}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(conversation)}
                className="p-1.5 text-muted-foreground opacity-100 transition hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
                aria-label={`Delete ${conversation.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div>
        <div className="border-b border-border bg-linear-to-br from-violet-500/12 via-card to-cyan-400/8 p-6">
          <span className="inline-flex rounded-2xl bg-violet-400/15 p-3 text-violet-300">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium text-violet-300">TravelAdvisor AI</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Plan your next trip with context.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your chat remains here while you explore cards and return.
          </p>
        </div>

        <div className="min-h-100 space-y-4 p-5">
          {(!active || messages.length === 0) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(active ? chatPrompts[active.id] ?? promptsForNewChat(active.id.length) : promptsForNewChat(0)).map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void ask(starter)}
                  className="rounded-2xl border border-border bg-background p-4 text-left text-sm transition hover:border-violet-400/50"
                >
                  <span className="flex gap-3">
                    <Bot className="h-4 w-4 shrink-0 text-violet-300" />
                    {starter}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={message.id ?? `${message.role}-${index}`}
              className={message.role === "user" ? "ml-auto max-w-3xl" : "max-w-3xl"}
            >
              <article
                className={`rounded-2xl p-4 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background"
                }`}
              >
                <p
                  className={`mb-2 text-xs font-semibold uppercase tracking-[.14em] ${
                    message.role === "user" ? "text-primary-foreground/70" : "text-violet-300"
                  }`}
                >
                  {message.role === "user" ? "You" : "TravelAdvisor AI"}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </article>

              {message.cards?.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {message.cards.map((card) => (
                    <ImageCard
                      key={card.slug}
                      href={card.href}
                      image={card.image}
                      alt={card.title}
                      query={`${card.title} ${card.location}`}
                      googlePhotoName={card.googlePhotoName}
                      googlePhotoAuthor={card.googlePhotoAuthor}
                      aspectRatio="landscape"
                    >
                      <div className="space-y-1.5 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-violet-300">
                          {card.source === "Google Maps" ? "Live Google Maps" : card.type}
                        </p>
                        <h2 className="line-clamp-1 text-sm font-semibold">{card.title}</h2>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {card.location}
                        </p>
                        {card.description ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {card.description}
                          </p>
                        ) : null}
                      </div>
                    </ImageCard>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {isLoading ? (
            <div className="flex gap-2 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin text-violet-300" />
              Planning a helpful answer...
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-t border-border p-4">
          <div className="flex items-end gap-3 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={active ? "Continue this trip conversation..." : "Ask about a place or trip..."}
              rows={2}
              maxLength={2000}
              className="min-h-15 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400 text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send question"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
        </form>
      </div>

      <AppModal
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open && !isManaging) setRenameTarget(null);
        }}
        ariaLabel="Rename AI chat"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void rename();
          }}
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-cyan-300">Chat history</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Rename this chat</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Use a clear name so you can find this trip later.</p>
            </div>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              disabled={isManaging}
              aria-label="Close"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <label className="mt-6 block text-sm font-medium text-slate-200">
            Chat name
            <input
              autoFocus
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setRenameTarget(null)} disabled={isManaging} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!renameTitle.trim() || isManaging} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">{isManaging ? "Saving…" : "Save name"}</button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isManaging) setDeleteTarget(null);
        }}
        ariaLabel="Delete AI chat"
        className="border-red-500/30"
      >
        <div>
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-xl font-semibold text-red-200">Delete this chat?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Delete <span className="font-medium text-white">{deleteTarget?.title}</span> and every message in it? This cannot be undone.</p>
            </div>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={isManaging} aria-label="Close" className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={isManaging} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-100 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void remove()} disabled={isManaging} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{isManaging ? "Deleting…" : "Delete chat"}</button>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
