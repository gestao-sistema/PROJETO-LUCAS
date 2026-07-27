import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  avatar: string;
  theme: "light" | "dark" | null;
}

interface ProfileState {
  profile: Profile | null;
  loggedIn: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<string | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
  uploadAvatar: (file: File) => Promise<string | null>;
}

function mapIdentifier(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed === "admin") return "admin@azime.com.br";
  return trimmed;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  loggedIn: false,
  loading: true,

  login: async (identifier, password) => {
    const email = mapIdentifier(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("user_id, name, email, role, phone, avatar, theme")
        .eq("user_id", data.user.id)
        .maybeSingle();

      set({
        loggedIn: true,
        loading: false,
        profile: profileRow
          ? {
              id: profileRow.user_id,
              name: profileRow.name,
              email: profileRow.email,
              role: profileRow.role,
              phone: profileRow.phone,
              avatar: profileRow.avatar,
              theme: profileRow.theme,
            }
          : {
              id: data.user.id,
              name: data.user.email ?? "Usuário",
              email: data.user.email ?? "",
              role: "Auxiliar",
              phone: "",
              avatar: "",
              theme: null,
            },
      });
    }
    return {};
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ profile: null, loggedIn: false });
  },

  refreshProfile: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ profile: null, loggedIn: false, loading: false });
      return;
    }
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("user_id, name, email, role, phone, avatar, theme")
      .eq("user_id", user.id)
      .maybeSingle();

    set({
      loggedIn: true,
      loading: false,
      profile: profileRow
        ? {
            id: profileRow.user_id,
            name: profileRow.name,
            email: profileRow.email,
            role: profileRow.role,
            phone: profileRow.phone,
            avatar: profileRow.avatar
              ? profileRow.avatar.includes("?")
                ? profileRow.avatar.replace(/\?t=\d+/, `?t=${Date.now()}`)
                : `${profileRow.avatar}?t=${Date.now()}`
              : "",
            theme: profileRow.theme,
          }
        : {
            id: user.id,
            name: user.email ?? "Usuário",
            email: user.email ?? "",
            role: "Auxiliar",
            phone: "",
            avatar: "",
            theme: null,
          },
    });
  },

  updateProfile: async (updates) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return "Usuário não autenticado";

    const current = get().profile;
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        ...updates,
        email: updates.email ?? user.email,
        name: updates.name ?? current?.name ?? user.email?.split("@")[0] ?? "Usuário",
        role: updates.role ?? current?.role ?? "Auxiliar",
        phone: updates.phone ?? current?.phone ?? "",
        avatar: updates.avatar ?? current?.avatar ?? "",
      },
      { onConflict: "user_id" },
    );

    if (error) return error.message;

    set((s) => ({
      profile: s.profile ? { ...s.profile, ...updates } : s.profile,
    }));
    return null;
  },

  changePassword: async (currentPassword, newPassword) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: get().profile?.email ?? "",
      password: currentPassword,
    });
    if (signInError) return "Senha atual incorreta";

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    return null;
  },

  uploadAvatar: async (file) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) return null;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const currentProfile = get().profile;
    const { error: dbError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        avatar: publicUrl,
        name: currentProfile?.name ?? user.email?.split("@")[0] ?? "Usuário",
      },
      { onConflict: "user_id" },
    );

    if (dbError) {
      console.error("[uploadAvatar] db upsert failed:", dbError);
      return null;
    }

    set((s) => ({
      profile: s.profile ? { ...s.profile, avatar: publicUrl } : s.profile,
    }));
    return publicUrl;
  },
}));

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    useProfile.getState().refreshProfile();
  } else {
    useProfile.setState({ profile: null, loggedIn: false, loading: false });
  }
});

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
