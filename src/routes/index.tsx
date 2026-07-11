import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Phone, Mail, MessageCircle, Globe, Copy, MapPin, Share2, QrCode, Download, Link2,
  FileText, Briefcase, Award, X, Lock, Facebook, Linkedin, Instagram, Github, Send, Twitter, Youtube,
} from "lucide-react";

import { getPublicData, verifyCvPassword } from "@/lib/admin.functions";
import { downloadVcf } from "@/lib/vcf";
import type { ContactItem, PublicData, SocialLink } from "@/lib/types";

const publicDataQuery = queryOptions({
  queryKey: ["public-data"],
  queryFn: () => getPublicData(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicDataQuery),
  head: () => ({
    meta: [
      { title: "Digital Visiting Card" },
      { name: "description", content: "Personal digital business card — tap, save, connect." },
    ],
  }),
  component: PublicProfilePage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card-premium p-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load profile.</p>
        <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

function PublicProfilePage() {
  const { data } = useSuspenseQuery(publicDataQuery);
  const { profile, contacts, socials } = data;
  const [showQR, setShowQR] = useState(false);
  const [cvDialog, setCvDialog] = useState(false);

  const primaryStyle = {
    "--primary": profile.theme_primary,
    "--accent": profile.theme_accent,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen pb-24" style={primaryStyle}>
      <div className="mx-auto w-full max-w-lg px-4 pt-4">
        {/* Cover + avatar */}
        <div className="animate-float-in">
          <div className="relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-elevated)]">
            {profile.visibility.cover && profile.cover_photo ? (
              <img src={profile.cover_photo} alt="" className="h-44 w-full object-cover sm:h-56" />
            ) : (
              <div
                className="h-44 w-full sm:h-56"
                style={{ background: `linear-gradient(135deg, ${profile.theme_primary}, ${profile.theme_accent})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="-mt-14 flex justify-center">
            <div className="rounded-full p-1.5 glass shadow-[var(--shadow-elevated)]">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt={profile.full_name} className="h-28 w-28 rounded-full object-cover" />
              ) : (
                <div
                  className="grid h-28 w-28 place-items-center rounded-full text-4xl font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${profile.theme_primary}, ${profile.theme_accent})` }}
                >
                  {profile.full_name.charAt(0) || "?"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="mt-4 text-center animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{profile.full_name}</h1>
          <p className="mt-1 text-base text-muted-foreground">{profile.designation}</p>
          {profile.company && (
            <p className="mt-0.5 text-sm font-medium" style={{ color: profile.theme_primary }}>
              {profile.company}
            </p>
          )}
          {profile.visibility.bio && profile.bio && (
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          )}
        </div>

        {/* Primary actions */}
        <div className="mt-6 grid grid-cols-3 gap-2 animate-fade-up">
          <button
            onClick={() => { downloadVcf(data); toast.success("Contact saved"); }}
            className="flex flex-col items-center gap-1 rounded-2xl p-3 text-white shadow-[var(--shadow-elevated)] transition-transform hover:-translate-y-0.5 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${profile.theme_primary}, ${profile.theme_accent})` }}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs font-semibold">Save</span>
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <QrCode className="h-5 w-5" style={{ color: profile.theme_primary }} />
            <span className="text-xs font-semibold">QR</span>
          </button>
          <button
            onClick={() => shareProfile(profile.full_name)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <Share2 className="h-5 w-5" style={{ color: profile.theme_primary }} />
            <span className="text-xs font-semibold">Share</span>
          </button>
        </div>

        {/* Contact */}
        {profile.visibility.contact && contacts.length > 0 && (
          <Section title="Contact">
            <div className="space-y-2">
              {contacts.map((c) => <ContactRow key={c.id} item={c} accent={profile.theme_primary} />)}
            </div>
          </Section>
        )}

        {/* Social */}
        {profile.visibility.social && socials.length > 0 && (
          <Section title="Connect">
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => <SocialChip key={s.id} link={s} accent={profile.theme_primary} />)}
            </div>
          </Section>
        )}

        {/* Address */}
        {profile.visibility.address && profile.address && (
          <Section title="Address">
            <div className="card-premium flex items-start gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${profile.theme_primary}15`, color: profile.theme_primary }}>
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{profile.address}</p>
                {profile.map_url && (
                  <a
                    href={profile.map_url} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white"
                    style={{ background: profile.theme_primary }}
                  >
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Documents */}
        {profile.visibility.documents && (profile.cv_url || profile.portfolio_url || profile.certificates.length > 0) && (
          <Section title="Documents">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {profile.cv_url && (
                <DocButton
                  icon={FileText}
                  label="View CV"
                  accent={profile.theme_primary}
                  onClick={() => {
                    if (profile.cv_password_enabled) setCvDialog(true);
                    else window.open(profile.cv_url!, "_blank");
                  }}
                  locked={profile.cv_password_enabled}
                />
              )}
              {profile.portfolio_url && (
                <DocButton
                  icon={Briefcase}
                  label="Portfolio"
                  accent={profile.theme_primary}
                  onClick={() => window.open(profile.portfolio_url!, "_blank")}
                />
              )}
              {profile.certificates.map((cert, i) => (
                <DocButton
                  key={i}
                  icon={Award}
                  label={cert.label}
                  accent={profile.theme_primary}
                  onClick={() => window.open(cert.url, "_blank")}
                />
              ))}
            </div>
          </Section>
        )}

        <div className="mt-10 flex justify-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
            className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2"
          >
            <Link2 className="h-3.5 w-3.5" /> Copy profile link
          </button>
        </div>
      </div>

      {showQR && (
        <QrModal profile={profile} onClose={() => setShowQR(false)} />
      )}
      {cvDialog && (
        <CvPasswordDialog
          accent={profile.theme_primary}
          onClose={() => setCvDialog(false)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 animate-fade-up">
      <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ContactRow({ item, accent }: { item: ContactItem; accent: string }) {
  const Icon = item.kind === "phone" ? Phone : item.kind === "email" ? Mail : item.kind === "whatsapp" ? MessageCircle : Globe;
  const primary = () => {
    if (item.kind === "phone") window.location.href = `tel:${item.value}`;
    else if (item.kind === "email") window.location.href = `mailto:${item.value}`;
    else if (item.kind === "whatsapp") window.open(`https://wa.me/${item.value.replace(/[^0-9]/g, "")}`, "_blank");
    else window.open(item.value.startsWith("http") ? item.value : `https://${item.value}`, "_blank");
  };
  const copy = () => { navigator.clipboard.writeText(item.value); toast.success("Copied"); };
  const primaryLabel = item.kind === "phone" ? "Call" : item.kind === "email" ? "Email" : item.kind === "whatsapp" ? "Chat" : "Open";
  return (
    <div className="card-premium flex items-center gap-3 p-3">
      <button onClick={primary} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-transform active:scale-95" style={{ background: accent }}>
        <Icon className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        {item.label && <p className="truncate text-xs text-muted-foreground">{item.label}</p>}
        <p className="truncate text-sm font-medium">{item.value}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={primary} className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: `${accent}15`, color: accent }}>
          {primaryLabel}
        </button>
        <button onClick={copy} className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook, linkedin: Linkedin, instagram: Instagram, github: Github,
  telegram: Send, twitter: Twitter, x: Twitter, youtube: Youtube,
};

function SocialChip({ link, accent }: { link: SocialLink; accent: string }) {
  const key = link.platform.toLowerCase();
  const Icon = SOCIAL_ICONS[key] || Globe;
  return (
    <a
      href={link.url} target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
    >
      <Icon className="h-4 w-4" style={{ color: accent }} />
      <span className="capitalize">{link.platform}</span>
    </a>
  );
}

function DocButton({
  icon: Icon, label, onClick, accent, locked,
}: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; accent: string; locked?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="card-premium flex items-center gap-3 p-4 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}15`, color: accent }}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

function shareProfile(name: string) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: name, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }
}

function QrModal({ profile, onClose }: { profile: PublicData["profile"]; onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4 animate-fade-up" onClick={onClose}>
      <div className="card-premium relative w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-secondary">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold">Scan to share</h3>
        <p className="mt-1 text-sm text-muted-foreground">{profile.full_name}</p>
        <div className="mt-4 grid place-items-center rounded-2xl bg-white p-4">
          {url && <QRCodeSVG value={url} size={220} fgColor={profile.theme_primary} bgColor="#ffffff" level="M" />}
        </div>
      </div>
    </div>
  );
}

function CvPasswordDialog({ accent, onClose }: { accent: string; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = useServerFn(verifyCvPassword);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await verify({ data: { password: pw } });
    setLoading(false);
    if (res.ok && res.cv_url) { window.open(res.cv_url, "_blank"); onClose(); }
    else toast.error("Incorrect password");
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4 animate-fade-up" onClick={onClose}>
      <form onSubmit={submit} className="card-premium relative w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-secondary">
          <X className="h-4 w-4" />
        </button>
        <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${accent}15`, color: accent }}>
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-lg font-semibold">Protected CV</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enter the password to view.</p>
        <input
          autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          className="mt-4 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as string]: accent }}
          placeholder="Password"
        />
        <button
          type="submit" disabled={loading || !pw}
          className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: accent }}
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

// Suppress unused-import warning for useQuery (kept for future extensions)
void useQuery;
