import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import type { AdminData, ContactItem, PublicData, PublicProfile, SocialLink, Visibility, Certificate } from "./types";

type GateSession = { authed?: boolean };

const sessionConfig = () => ({
  password: process.env.SESSION_SECRET!,
  name: "nfc-admin",
  maxAge: 60 * 60 * 24 * 30,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
});

function sha256(v: string) {
  return createHash("sha256").update(v, "utf8").digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function requireAuth() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
  return session;
}

// Only fields safe for public consumption
const PUBLIC_COLS =
  "full_name,designation,company,bio,profile_photo,cover_photo,address,map_url,cv_url,cv_password_enabled,portfolio_url,certificates,theme_primary,theme_accent,button_style,card_radius,visibility";

function coerceProfile(row: Record<string, unknown>): PublicProfile {
  return {
    full_name: (row.full_name as string) ?? "",
    designation: (row.designation as string) ?? "",
    company: (row.company as string) ?? "",
    bio: (row.bio as string) ?? "",
    profile_photo: (row.profile_photo as string | null) ?? null,
    cover_photo: (row.cover_photo as string | null) ?? null,
    address: (row.address as string) ?? "",
    map_url: (row.map_url as string | null) ?? null,
    cv_url: (row.cv_url as string | null) ?? null,
    cv_password_enabled: Boolean(row.cv_password_enabled),
    portfolio_url: (row.portfolio_url as string | null) ?? null,
    certificates: (row.certificates as Certificate[] | null) ?? [],
    theme_primary: (row.theme_primary as string) ?? "#2563eb",
    theme_accent: (row.theme_accent as string) ?? "#0ea5e9",
    button_style: (row.button_style as string) ?? "rounded",
    card_radius: (row.card_radius as string) ?? "2xl",
    visibility: (row.visibility as Visibility) ?? {
      contact: true, social: true, address: true, documents: true, bio: true, cover: true,
    },
  };
}

export const getPublicData = createServerFn({ method: "GET" }).handler(async (): Promise<PublicData> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
    supabaseAdmin.from("profile").select(PUBLIC_COLS).eq("id", 1).maybeSingle(),
    supabaseAdmin.from("contact_items").select("*").eq("hidden", false).order("sort_order"),
    supabaseAdmin.from("social_links").select("*").eq("hidden", false).order("sort_order"),
  ]);
  return {
    profile: coerceProfile((p as Record<string, unknown>) ?? {}),
    contacts: (c ?? []) as ContactItem[],
    socials: (s ?? []) as SocialLink[],
  };
});

export const getAdminData = createServerFn({ method: "GET" }).handler(async (): Promise<AdminData> => {
  await requireAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
    supabaseAdmin.from("profile").select(`${PUBLIC_COLS},admin_passcode_hash`).eq("id", 1).maybeSingle(),
    supabaseAdmin.from("contact_items").select("*").order("sort_order"),
    supabaseAdmin.from("social_links").select("*").order("sort_order"),
  ]);
  const row = (p as Record<string, unknown>) ?? {};
  return {
    profile: coerceProfile(row),
    contacts: (c ?? []) as ContactItem[],
    socials: (s ?? []) as SocialLink[],
    hasPasscode: Boolean(row.admin_passcode_hash),
  };
});

export const authStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profile").select("admin_passcode_hash").eq("id", 1).maybeSingle();
  return {
    authed: Boolean(session.data.authed),
    hasPasscode: Boolean((data as { admin_passcode_hash: string | null } | null)?.admin_passcode_hash),
  };
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    if (!data.passcode || data.passcode.length < 4) return { ok: false as const, error: "Passcode too short" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("profile").select("admin_passcode_hash").eq("id", 1).maybeSingle();
    const stored = (row as { admin_passcode_hash: string | null } | null)?.admin_passcode_hash;
    const session = await useSession<GateSession>(sessionConfig());

    if (!stored) {
      // First-time setup: set the passcode
      const hash = sha256(data.passcode);
      await supabaseAdmin.from("profile").update({ admin_passcode_hash: hash }).eq("id", 1);
      await session.update({ authed: true });
      return { ok: true as const, firstTime: true };
    }

    if (!safeEqual(sha256(data.passcode), stored)) {
      return { ok: false as const, error: "Incorrect passcode" };
    }
    await session.update({ authed: true });
    return { ok: true as const, firstTime: false };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const changePasscode = createServerFn({ method: "POST" })
  .inputValidator((d: { current: string; next: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    if (!data.next || data.next.length < 4) return { ok: false as const, error: "New passcode too short" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("profile").select("admin_passcode_hash").eq("id", 1).maybeSingle();
    const stored = (row as { admin_passcode_hash: string | null } | null)?.admin_passcode_hash;
    if (stored && !safeEqual(sha256(data.current), stored)) return { ok: false as const, error: "Current passcode wrong" };
    await supabaseAdmin.from("profile").update({ admin_passcode_hash: sha256(data.next) }).eq("id", 1);
    return { ok: true as const };
  });

export const verifyCvPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profile")
      .select("cv_password_hash,cv_password_enabled,cv_url")
      .eq("id", 1)
      .maybeSingle();
    const r = row as { cv_password_hash: string | null; cv_password_enabled: boolean; cv_url: string | null } | null;
    if (!r?.cv_password_enabled || !r.cv_password_hash) return { ok: true as const, cv_url: r?.cv_url ?? null };
    if (!safeEqual(sha256(data.password), r.cv_password_hash)) return { ok: false as const };
    return { ok: true as const, cv_url: r.cv_url };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d: {
    patch: Partial<PublicProfile> & { cv_password?: string | null };
  }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cv_password, ...rest } = data.patch;
    const update: Record<string, unknown> = { ...rest };
    if (typeof cv_password === "string") {
      update.cv_password_hash = cv_password ? sha256(cv_password) : null;
    }
    const { error } = await supabaseAdmin.from("profile").update(update as never).eq("id", 1);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const upsertContact = createServerFn({ method: "POST" })
  .inputValidator((d: { item: Partial<ContactItem> & { kind: ContactItem["kind"]; value: string } }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { item } = data;
    if (item.id) {
      const { error } = await supabaseAdmin.from("contact_items").update({
        kind: item.kind, label: item.label ?? "", value: item.value, hidden: item.hidden ?? false, sort_order: item.sort_order ?? 0,
      }).eq("id", item.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("contact_items").insert({
        kind: item.kind, label: item.label ?? "", value: item.value, hidden: item.hidden ?? false, sort_order: item.sort_order ?? 0,
      });
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("contact_items").delete().eq("id", data.id);
    return { ok: true as const };
  });

export const upsertSocial = createServerFn({ method: "POST" })
  .inputValidator((d: { item: Partial<SocialLink> & { platform: string; url: string } }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { item } = data;
    if (item.id) {
      const { error } = await supabaseAdmin.from("social_links").update({
        platform: item.platform, url: item.url, hidden: item.hidden ?? false, sort_order: item.sort_order ?? 0,
      }).eq("id", item.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("social_links").insert({
        platform: item.platform, url: item.url, hidden: item.hidden ?? false, sort_order: item.sort_order ?? 0,
      });
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const deleteSocial = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("social_links").delete().eq("id", data.id);
    return { ok: true as const };
  });

export const backupData = createServerFn({ method: "GET" }).handler(async () => {
  await requireAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
    supabaseAdmin.from("profile").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("contact_items").select("*"),
    supabaseAdmin.from("social_links").select("*"),
  ]);
  return { profile: p, contacts: c, socials: s, exported_at: new Date().toISOString() };
});

export const restoreData = createServerFn({ method: "POST" })
  .inputValidator((d: { payload: { profile: Record<string, unknown>; contacts: unknown[]; socials: unknown[] } }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile, contacts, socials } = data.payload;
    if (profile) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = profile as Record<string, unknown>;
      await supabaseAdmin.from("profile").update(rest as never).eq("id", 1);
    }
    if (Array.isArray(contacts)) {
      await supabaseAdmin.from("contact_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const rows = contacts.map((r) => {
        const { id: _id, created_at: _c, ...rest } = r as Record<string, unknown>;
        return rest;
      });
      if (rows.length) await supabaseAdmin.from("contact_items").insert(rows as never);
    }
    if (Array.isArray(socials)) {
      await supabaseAdmin.from("social_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const rows = socials.map((r) => {
        const { id: _id, created_at: _c, ...rest } = r as Record<string, unknown>;
        return rest;
      });
      if (rows.length) await supabaseAdmin.from("social_links").insert(rows as never);
    }
    return { ok: true as const };
  });
