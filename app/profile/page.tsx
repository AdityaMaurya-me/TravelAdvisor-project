"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { AppModal } from "@/components/ui/app-modal";

export default function ProfilePage() {
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        requireAuth();
        return;
      }

      setId(user.id);
      setEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.display_name || user.email?.split("@")[0] || "Traveller");
      setAvatar(data?.avatar_url || "");
    })();
  }, [requireAuth]);

  const save = async () => {
    if (!id || !name.trim()) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id, display_name: name.trim(), avatar_url: avatar || null });
    setMessage(error?.message || "Profile updated.");
    if (!error) router.refresh();
  };

  const upload = async (file?: File) => {
    if (!file || !id) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      setMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    const path = `${id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("profile-avatars").upload(path, file, { upsert: true });
    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
    setMessage("Photo ready. Save profile to apply it everywhere.");
  };

  const openDeleteDialog = () => {
    setDeleteError("");
    setConfirmDelete(true);
  };

  const closeDeleteDialog = () => {
    if (!isDeleting) setConfirmDelete(false);
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");

    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setDeleteError(error.message || "We could not remove your account. Please try again.");
      setIsDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#07111e] text-white">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-32 overflow-hidden rounded-full bg-slate-800">
            {avatar ? (
              <Image src={avatar} alt="Profile photo" fill className="object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-4xl font-bold text-cyan-300">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/50 text-sm opacity-0 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
              Change photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void upload(event.target.files?.[0])}
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

          <section id="settings" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold">Account settings</h2>
            <p className="mt-1 text-sm text-slate-400">Manage your TravelAdvisor identity and preferences.</p>
          </section>

          <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
            <h2 className="text-xl font-semibold text-red-200">Remove account</h2>
            <p className="mt-1 text-sm text-slate-400">Permanently delete your account and data from every device.</p>
            <button type="button" onClick={openDeleteDialog} className="mt-5 rounded-lg border border-red-400/40 px-4 py-3 text-red-200">
              Remove account
            </button>
          </section>
        </div>
      </section>

      {confirmDelete && (
        <AppModal open={confirmDelete} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }} ariaLabel="Permanently remove account" className="border-red-500/30">
            <h2 className="text-xl font-semibold text-red-200">Permanently remove account?</h2>
            <p className="mt-3 text-sm text-slate-300">This cannot be undone. You will need to sign in again to use account features.</p>
            {deleteError && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeDeleteDialog} disabled={isDeleting} className="rounded-lg border border-slate-700 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={() => void deleteAccount()} disabled={isDeleting} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white disabled:cursor-wait disabled:opacity-70">
                {isDeleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
        </AppModal>
      )}
      <Footer />
    </main>
  );
}
