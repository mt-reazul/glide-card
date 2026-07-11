import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, User, Phone, Share2, MapPin, FileText, Palette, Settings as SettingsIcon,
  LogOut, Plus, Trash2, Eye, EyeOff, Save, Upload, Download, Lock, Image as ImageIcon, Menu, X,
  ExternalLink,
} from "lucide-react";

import {
  authStatus, login, logout, getAdminData, saveProfile, changePasscode,
  upsertContact, deleteContact, upsertSocial, deleteSocial, backupData, restoreData,
} from "@/lib/admin.functions";
import type { AdminData, ContactItem, PublicProfile, SocialLink, Visibility } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Digital Card" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const statusFn = useServerFn(authStatus);
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => statusFn(),
    staleTime: 0,
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!status?.authed) return <LoginScreen hasPasscode={status?.hasPasscode ?? false} onSuccess={() => refetch()} />;
  return <Dashboard onLogout={() => refetch()} />;
}

function LoginScreen({ hasPasscode, onSuccess }: { hasPasscode: boolean; onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const loginFn = useServerFn(login);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginFn({ data: { passcode: pw } });
    setLoading(false);
    if (res.ok) {
      if (res.firstTime) toast.success("Passcode set. Welcome!");
      onSuccess();
    } else {
      toast.error(res.error || "Failed");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card-premium w-full max-w-sm p-8 animate-float-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl btn-hero text-white">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Admin Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasPasscode ? "Enter your passcode to continue." : "Set a passcode to secure your admin panel."}
        </p>
        <input
          autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          className="mt-6 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder={hasPasscode ? "Enter passcode" : "Choose a passcode (min 4 chars)"}
          minLength={4}
        />
        <button type="submit" disabled={loading || pw.length < 4} className="mt-3 w-full rounded-xl btn-hero py-3 text-sm font-semibold disabled:opacity-50">
          {loading ? "…" : hasPasscode ? "Sign in" : "Set passcode & sign in"}
        </button>
        <a href="/" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">← Back to card</a>
      </form>
    </div>
  );
}

type Tab = "dashboard" | "profile" | "contact" | "social" | "address" | "documents" | "appearance" | "settings";
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "social", label: "Social Links", icon: Share2 },
  { id: "address", label: "Address", icon: MapPin },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const qc = useQueryClient();
  const dataFn = useServerFn(getAdminData);
  const logoutFn = useServerFn(logout);
  const { data, isLoading } = useQuery({ queryKey: ["admin-data"], queryFn: () => dataFn() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["public-data"] });
  };

  const handleLogout = async () => {
    await logoutFn();
    onLogout();
  };

  if (isLoading || !data) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setMenuOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm">
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="font-semibold">{TABS.find((t) => t.id === tab)?.label}</h1>
          <a href="/" target="_blank" className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        <aside className={`fixed inset-0 z-40 bg-black/40 lg:relative lg:inset-auto lg:bg-transparent ${menuOpen ? "" : "hidden lg:block"}`} onClick={() => setMenuOpen(false)}>
          <div className="h-full w-64 bg-white p-4 shadow-xl lg:sticky lg:top-6 lg:h-auto lg:rounded-2xl lg:shadow-[var(--shadow-soft)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-3 hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{data.profile.full_name || "Your card"}</p>
            </div>
            <nav className="space-y-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${tab === t.id ? "btn-hero text-white shadow-[var(--shadow-soft)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="mt-4 border-t border-border pt-3">
              <a href="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                <ExternalLink className="h-4 w-4" /> View public card
              </a>
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 space-y-4">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">{TABS.find((t) => t.id === tab)?.label}</h1>
          </div>
          {tab === "dashboard" && <DashboardTab data={data} setTab={setTab} />}
          {tab === "profile" && <ProfileTab data={data} refresh={refresh} />}
          {tab === "contact" && <ContactTab data={data} refresh={refresh} />}
          {tab === "social" && <SocialTab data={data} refresh={refresh} />}
          {tab === "address" && <AddressTab data={data} refresh={refresh} />}
          {tab === "documents" && <DocumentsTab data={data} refresh={refresh} />}
          {tab === "appearance" && <AppearanceTab data={data} refresh={refresh} />}
          {tab === "settings" && <SettingsTab data={data} refresh={refresh} />}
        </main>
      </div>
    </div>
  );
}

/* ============ Dashboard Tab ============ */
function DashboardTab({ data, setTab }: { data: AdminData; setTab: (t: Tab) => void }) {
  const stats = [
    { label: "Contact items", value: data.contacts.length, tab: "contact" as Tab },
    { label: "Social links", value: data.socials.length, tab: "social" as Tab },
    { label: "Certificates", value: data.profile.certificates.length, tab: "documents" as Tab },
    { label: "Hidden sections", value: Object.values(data.profile.visibility).filter((v) => !v).length, tab: "appearance" as Tab },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={() => setTab(s.tab)} className="card-premium p-4 text-left transition-transform hover:-translate-y-0.5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </button>
        ))}
      </div>
      <div className="card-premium p-5">
        <h3 className="font-semibold">Section visibility</h3>
        <p className="mt-1 text-sm text-muted-foreground">Toggle sections shown on your public card.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(data.profile.visibility) as Array<keyof Visibility>).map((k) => (
            <VisibilityToggle key={k} keyName={k} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VisibilityToggle({ keyName, data }: { keyName: keyof Visibility; data: AdminData }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveProfile);
  const mut = useMutation({
    mutationFn: async (next: boolean) => saveFn({ data: { patch: { visibility: { ...data.profile.visibility, [keyName]: next } } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-data"] }); qc.invalidateQueries({ queryKey: ["public-data"] }); },
  });
  const on = data.profile.visibility[keyName];
  return (
    <button
      onClick={() => mut.mutate(!on)}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${on ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
    >
      <span className="capitalize">{keyName}</span>
      {on ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}

/* ============ Profile Tab ============ */
function ProfileTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [form, setForm] = useState({
    full_name: data.profile.full_name,
    designation: data.profile.designation,
    company: data.profile.company,
    bio: data.profile.bio,
    profile_photo: data.profile.profile_photo,
    cover_photo: data.profile.cover_photo,
  });
  const saveFn = useServerFn(saveProfile);
  const mut = useMutation({
    mutationFn: () => saveFn({ data: { patch: form } }),
    onSuccess: () => { toast.success("Profile saved"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-premium space-y-4 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <ImageField label="Profile photo" value={form.profile_photo} onChange={(v) => setForm({ ...form, profile_photo: v })} shape="round" />
        <ImageField label="Cover photo" value={form.cover_photo} onChange={(v) => setForm({ ...form, cover_photo: v })} shape="wide" />
      </div>
      <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
      <Field label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
      <Field label="Company / Organization" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
      <Field label="Professional bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} textarea />
      <SaveBar onSave={() => mut.mutate()} loading={mut.isPending} />
    </div>
  );
}

/* ============ Contact Tab ============ */
function ContactTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const upsertFn = useServerFn(upsertContact);
  const deleteFn = useServerFn(deleteContact);
  const [draft, setDraft] = useState<{ kind: ContactItem["kind"]; label: string; value: string }>({ kind: "phone", label: "", value: "" });

  const upsert = useMutation({
    mutationFn: (item: Partial<ContactItem> & { kind: ContactItem["kind"]; value: string }) => upsertFn({ data: { item } }),
    onSuccess: () => { refresh(); setDraft({ kind: "phone", label: "", value: "" }); toast.success("Saved"); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { refresh(); toast.success("Removed"); },
  });

  return (
    <div className="space-y-3">
      <div className="card-premium space-y-3 p-4">
        <p className="text-sm font-semibold">Add new</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ContactItem["kind"] })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="website">Website</option>
          </select>
          <input placeholder="Label (optional)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm" />
          <input placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm sm:col-span-1" />
          <button disabled={!draft.value} onClick={() => upsert.mutate(draft)} className="rounded-xl btn-hero px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Plus className="mr-1 inline h-4 w-4" /> Add
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {data.contacts.map((c) => (
          <ContactRowEdit key={c.id} item={c} onSave={(patch) => upsert.mutate({ ...c, ...patch })} onDelete={() => del.mutate(c.id)} />
        ))}
        {data.contacts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No contact items yet.</p>}
      </div>
    </div>
  );
}

function ContactRowEdit({ item, onSave, onDelete }: { item: ContactItem; onSave: (p: Partial<ContactItem>) => void; onDelete: () => void }) {
  const [v, setV] = useState({ label: item.label, value: item.value });
  const dirty = v.label !== item.label || v.value !== item.value;
  return (
    <div className="card-premium flex flex-wrap items-center gap-2 p-3">
      <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold uppercase text-primary">{item.kind}</span>
      <input value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="Label"
        className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
      <input value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })}
        className="min-w-0 flex-[2] rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
      {dirty && <button onClick={() => onSave(v)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" /></button>}
      <button onClick={() => onSave({ hidden: !item.hidden })} className="grid h-8 w-8 place-items-center rounded-lg bg-secondary">
        {item.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/* ============ Social Tab ============ */
const SOCIAL_OPTIONS = ["Facebook", "LinkedIn", "Instagram", "GitHub", "Telegram", "X", "YouTube"];

function SocialTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const upsertFn = useServerFn(upsertSocial);
  const deleteFn = useServerFn(deleteSocial);
  const [draft, setDraft] = useState({ platform: "Facebook", url: "" });
  const upsert = useMutation({
    mutationFn: (item: Partial<SocialLink> & { platform: string; url: string }) => upsertFn({ data: { item } }),
    onSuccess: () => { refresh(); setDraft({ platform: "Facebook", url: "" }); toast.success("Saved"); },
  });
  const del = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: () => { refresh(); toast.success("Removed"); } });

  return (
    <div className="space-y-3">
      <div className="card-premium space-y-3 p-4">
        <p className="text-sm font-semibold">Add new</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <select value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
            {SOCIAL_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="URL" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm" />
          <button disabled={!draft.url} onClick={() => upsert.mutate(draft)} className="rounded-xl btn-hero px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Plus className="mr-1 inline h-4 w-4" /> Add
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {data.socials.map((s) => (
          <SocialRowEdit key={s.id} item={s} onSave={(p) => upsert.mutate({ ...s, ...p })} onDelete={() => del.mutate(s.id)} />
        ))}
        {data.socials.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No social links yet.</p>}
      </div>
    </div>
  );
}

function SocialRowEdit({ item, onSave, onDelete }: { item: SocialLink; onSave: (p: Partial<SocialLink>) => void; onDelete: () => void }) {
  const [v, setV] = useState({ platform: item.platform, url: item.url });
  const dirty = v.platform !== item.platform || v.url !== item.url;
  return (
    <div className="card-premium flex flex-wrap items-center gap-2 p-3">
      <select value={v.platform} onChange={(e) => setV({ ...v, platform: e.target.value })} className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm">
        {SOCIAL_OPTIONS.map((s) => <option key={s}>{s}</option>)}
      </select>
      <input value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })}
        className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
      {dirty && <button onClick={() => onSave(v)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" /></button>}
      <button onClick={() => onSave({ hidden: !item.hidden })} className="grid h-8 w-8 place-items-center rounded-lg bg-secondary">
        {item.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/* ============ Address Tab ============ */
function AddressTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [form, setForm] = useState({ address: data.profile.address, map_url: data.profile.map_url ?? "" });
  const saveFn = useServerFn(saveProfile);
  const mut = useMutation({
    mutationFn: () => saveFn({ data: { patch: { address: form.address, map_url: form.map_url } } }),
    onSuccess: () => { toast.success("Address saved"); refresh(); },
  });
  return (
    <div className="card-premium space-y-4 p-5">
      <Field label="Current address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} textarea />
      <Field label="Google Maps URL" value={form.map_url} onChange={(v) => setForm({ ...form, map_url: v })} placeholder="https://maps.google.com/?q=…" />
      <SaveBar onSave={() => mut.mutate()} loading={mut.isPending} />
    </div>
  );
}

/* ============ Documents Tab ============ */
function DocumentsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [form, setForm] = useState({
    cv_url: data.profile.cv_url ?? "",
    cv_password_enabled: data.profile.cv_password_enabled,
    cv_password: "",
    portfolio_url: data.profile.portfolio_url ?? "",
    certificates: data.profile.certificates,
  });
  const saveFn = useServerFn(saveProfile);
  const mut = useMutation({
    mutationFn: () => saveFn({
      data: {
        patch: {
          cv_url: form.cv_url,
          cv_password_enabled: form.cv_password_enabled,
          portfolio_url: form.portfolio_url,
          certificates: form.certificates,
          ...(form.cv_password ? { cv_password: form.cv_password } : {}),
        },
      },
    }),
    onSuccess: () => { toast.success("Saved"); setForm({ ...form, cv_password: "" }); refresh(); },
  });

  const addCert = () => setForm({ ...form, certificates: [...form.certificates, { label: "", url: "" }] });
  const updateCert = (i: number, patch: Partial<{ label: string; url: string }>) =>
    setForm({ ...form, certificates: form.certificates.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const rmCert = (i: number) => setForm({ ...form, certificates: form.certificates.filter((_, idx) => idx !== i) });

  return (
    <div className="card-premium space-y-4 p-5">
      <div>
        <p className="mb-2 text-sm font-semibold">CV (Google Drive link)</p>
        <Field label="Drive URL" value={form.cv_url} onChange={(v) => setForm({ ...form, cv_url: v })} placeholder="https://drive.google.com/…" />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.cv_password_enabled} onChange={(e) => setForm({ ...form, cv_password_enabled: e.target.checked })} />
          Password-protect CV
        </label>
        {form.cv_password_enabled && (
          <Field label={data.profile.cv_password_enabled ? "New CV password (leave blank to keep)" : "Set CV password"}
            value={form.cv_password} onChange={(v) => setForm({ ...form, cv_password: v })} type="password" />
        )}
      </div>
      <div className="border-t border-border pt-4">
        <Field label="Portfolio URL" value={form.portfolio_url} onChange={(v) => setForm({ ...form, portfolio_url: v })} />
      </div>
      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Certificates</p>
          <button onClick={addCert} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Plus className="mr-1 inline h-3.5 w-3.5" /> Add</button>
        </div>
        <div className="space-y-2">
          {form.certificates.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input value={c.label} onChange={(e) => updateCert(i, { label: e.target.value })} placeholder="Label"
                className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
              <input value={c.url} onChange={(e) => updateCert(i, { url: e.target.value })} placeholder="URL"
                className="min-w-0 flex-[2] rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
              <button onClick={() => rmCert(i)} className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
      <SaveBar onSave={() => mut.mutate()} loading={mut.isPending} />
    </div>
  );
}

/* ============ Appearance Tab ============ */
function AppearanceTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [form, setForm] = useState({
    theme_primary: data.profile.theme_primary,
    theme_accent: data.profile.theme_accent,
    button_style: data.profile.button_style,
    card_radius: data.profile.card_radius,
    visibility: data.profile.visibility,
  });
  const saveFn = useServerFn(saveProfile);
  const mut = useMutation({
    mutationFn: () => saveFn({ data: { patch: form } }),
    onSuccess: () => { toast.success("Appearance saved"); refresh(); },
  });

  return (
    <div className="card-premium space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Theme color</label>
          <div className="mt-1 flex items-center gap-3">
            <input type="color" value={form.theme_primary} onChange={(e) => setForm({ ...form, theme_primary: e.target.value })} className="h-12 w-16 cursor-pointer rounded-xl border border-border" />
            <input value={form.theme_primary} onChange={(e) => setForm({ ...form, theme_primary: e.target.value })} className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">Accent color</label>
          <div className="mt-1 flex items-center gap-3">
            <input type="color" value={form.theme_accent} onChange={(e) => setForm({ ...form, theme_accent: e.target.value })} className="h-12 w-16 cursor-pointer rounded-xl border border-border" />
            <input value={form.theme_accent} onChange={(e) => setForm({ ...form, theme_accent: e.target.value })} className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Button style</label>
          <select value={form.button_style} onChange={(e) => setForm({ ...form, button_style: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm">
            <option value="rounded">Rounded (pill)</option>
            <option value="squared">Squared</option>
            <option value="soft">Soft</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold">Card radius</label>
          <select value={form.card_radius} onChange={(e) => setForm({ ...form, card_radius: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm">
            <option value="lg">Medium</option>
            <option value="xl">Large</option>
            <option value="2xl">Extra large</option>
            <option value="3xl">Pillow</option>
          </select>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Section visibility</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(form.visibility) as Array<keyof Visibility>).map((k) => (
            <button key={k} onClick={() => setForm({ ...form, visibility: { ...form.visibility, [k]: !form.visibility[k] } })}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${form.visibility[k] ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <span className="capitalize">{k}</span>
              {form.visibility[k] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
      <SaveBar onSave={() => mut.mutate()} loading={mut.isPending} />
    </div>
  );
}

/* ============ Settings Tab ============ */
function SettingsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [pw, setPw] = useState({ current: "", next: "" });
  const changeFn = useServerFn(changePasscode);
  const backupFn = useServerFn(backupData);
  const restoreFn = useServerFn(restoreData);
  const fileRef = useRef<HTMLInputElement>(null);

  const change = useMutation({
    mutationFn: () => changeFn({ data: pw }),
    onSuccess: (r) => {
      if (r.ok) { toast.success("Passcode updated"); setPw({ current: "", next: "" }); }
      else toast.error(r.error || "Failed");
    },
  });

  const doBackup = async () => {
    const payload = await backupFn();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `card-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const doRestore = async (f: File) => {
    try {
      const text = await f.text();
      const payload = JSON.parse(text);
      await restoreFn({ data: { payload } });
      toast.success("Data restored");
      refresh();
    } catch (e) {
      toast.error("Invalid backup file");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-premium space-y-3 p-5">
        <h3 className="font-semibold">Change admin passcode</h3>
        <Field label="Current passcode" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} type="password" />
        <Field label="New passcode" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} type="password" />
        <button disabled={!pw.next || pw.next.length < 4} onClick={() => change.mutate()} className="rounded-xl btn-hero px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          Update passcode
        </button>
      </div>
      <div className="card-premium space-y-3 p-5">
        <h3 className="font-semibold">Backup & Restore</h3>
        <p className="text-sm text-muted-foreground">Download or restore all card data as JSON.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={doBackup} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Download className="mr-1 inline h-4 w-4" /> Download backup</button>
          <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"><Upload className="mr-1 inline h-4 w-4" /> Restore from file</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ""; }} />
        </div>
        <p className="text-xs text-muted-foreground">Card last updated for: {data.profile.full_name}</p>
      </div>
    </div>
  );
}

/* ============ Shared building blocks ============ */
function Field({ label, value, onChange, textarea, type, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className="mt-1 w-full resize-y rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
      ) : (
        <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
      )}
    </div>
  );
}

function SaveBar({ onSave, loading }: { onSave: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <button onClick={onSave} disabled={loading} className="rounded-xl btn-hero px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        <Save className="mr-1 inline h-4 w-4" /> {loading ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function ImageField({ label, value, onChange, shape }: { label: string; value: string | null; onChange: (v: string | null) => void; shape: "round" | "wide" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (f: File) => {
    if (f.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result as string); setBusy(false); };
    reader.onerror = () => { setBusy(false); toast.error("Failed to read image"); };
    reader.readAsDataURL(f);
  };

  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <div className={`mt-1 flex items-center gap-3`}>
        <div className={`overflow-hidden bg-secondary ${shape === "round" ? "h-20 w-20 rounded-full" : "h-20 w-32 rounded-xl"}`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => ref.current?.click()} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Upload className="mr-1 inline h-3.5 w-3.5" /> {busy ? "…" : "Upload"}
          </button>
          {value && <button onClick={() => onChange(null)} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">Remove</button>}
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
      </div>
    </div>
  );
}
