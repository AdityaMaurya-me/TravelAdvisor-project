"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { readCachedProfile, writeCachedProfile } from "@/lib/auth/profile-cache";

export default function ProfilePage() {
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        requireAuth();
        return;
      }

      setId(user.id);
      setEmail(user.email ?? "");
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const cached = readCachedProfile();
      const sameUserCache = cached?.userId === user.id ? cached : null;
      const nextName = data?.display_name || sameUserCache?.name || user.email?.split("@")[0] || "Traveller";
      const nextAvatar = profileError ? sameUserCache?.avatar || "" : data?.avatar_url || "";
      setName(nextName);
      setAvatar(nextAvatar);
      writeCachedProfile({ userId: user.id, email: user.email ?? "", name: nextName, avatar: nextAvatar, isAdmin: sameUserCache?.isAdmin ?? false });
    })();
  }, [requireAuth]);

  const save = async () => {
    if (!id || !name.trim()) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id, display_name: name.trim(), avatar_url: avatar || null });
    setMessage(error?.message || "Profile updated.");
    if (!error) {
      window.dispatchEvent(new CustomEvent("traveladvisor:profile-updated", { detail: { name: name.trim(), avatar } }));
      router.refresh();
    }
  };

  const upload = async (file?: File) => {
    if (!file || !id) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      setMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Choose an image smaller than 5 MB.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    // Keep the header avatar in sync with the local preview while the upload
    // is in progress. It is replaced with the persisted Storage URL on
    // success, or restored to the previous avatar on failure.
    window.dispatchEvent(new CustomEvent("traveladvisor:profile-updated", { detail: { name: name.trim() || email.split("@")[0] || "Traveller", avatar: localPreview } }));
    setIsUploading(true);
    setMessage("Uploading profile photo…");
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("profile-avatars").upload(path, file, { upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const nextAvatar = data.publicUrl;
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id, display_name: name.trim() || email.split("@")[0] || "Traveller", avatar_url: nextAvatar });
      if (profileError) throw profileError;
      setAvatar(nextAvatar);
      URL.revokeObjectURL(localPreview);
      setAvatarPreview("");
      window.dispatchEvent(new CustomEvent("traveladvisor:profile-updated", { detail: { name: name.trim() || email.split("@")[0] || "Traveller", avatar: nextAvatar } }));
      setMessage("Profile photo updated everywhere.");
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview("");
      window.dispatchEvent(new CustomEvent("traveladvisor:profile-updated", { detail: { name: name.trim() || email.split("@")[0] || "Traveller", avatar } }));
      setMessage(error instanceof Error ? error.message : "We could not upload that photo. Please try another image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-32 overflow-hidden rounded-full bg-slate-800">
            {avatarPreview || avatar ? (
              <img
                src={avatarPreview || avatar}
                alt="Profile photo"
                className="h-full w-full object-cover"
                onError={() => { setAvatarPreview(""); setAvatar(""); setMessage("Your profile photo could not be displayed. Please upload it again."); }}
              />
            ) : (
              <div className="grid h-full place-items-center text-4xl font-bold text-cyan-300">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/50 text-sm opacity-0 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
              {isUploading ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploading}
                onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }}
                className="sr-only"
              />
            </label>
          </div>
          <div>
            <h1 className="text-4xl font-bold">{name || "Traveller"}</h1>
            <p className="mt-2 text-slate-400">{email}</p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold">Edit profile</h2>
            <p className="mt-1 text-sm text-slate-400">Change the name shown across TravelAdvisor.</p>
            <label className="mt-5 block text-sm">
              Username
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" />
            </label>
            <button type="button" onClick={() => void save()} className="mt-4 rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
              Save profile
            </button>
            {message && <p className="mt-3 text-sm text-cyan-200">{message}</p>}
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}
