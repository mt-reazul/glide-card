import type { PublicData } from "./types";

function esc(v: string) {
  return v.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export function generateVcf(data: PublicData): string {
  const { profile, contacts, socials } = data;
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`FN:${esc(profile.full_name)}`);
  const parts = profile.full_name.split(" ");
  const last = parts.length > 1 ? parts.pop() : "";
  lines.push(`N:${esc(last || "")};${esc(parts.join(" "))};;;`);
  if (profile.company) lines.push(`ORG:${esc(profile.company)}`);
  if (profile.designation) lines.push(`TITLE:${esc(profile.designation)}`);
  if (profile.bio) lines.push(`NOTE:${esc(profile.bio)}`);
  if (profile.address) lines.push(`ADR;TYPE=WORK:;;${esc(profile.address)};;;;`);

  for (const c of contacts) {
    if (c.hidden) continue;
    if (c.kind === "phone") lines.push(`TEL;TYPE=CELL:${esc(c.value)}`);
    else if (c.kind === "whatsapp") lines.push(`TEL;TYPE=WhatsApp:${esc(c.value)}`);
    else if (c.kind === "email") lines.push(`EMAIL:${esc(c.value)}`);
    else if (c.kind === "website") lines.push(`URL:${esc(c.value)}`);
  }

  for (const s of socials) {
    if (s.hidden) continue;
    lines.push(`X-SOCIALPROFILE;TYPE=${esc(s.platform)}:${esc(s.url)}`);
  }

  if (profile.profile_photo && profile.profile_photo.startsWith("data:image")) {
    const m = profile.profile_photo.match(/^data:image\/(\w+);base64,(.+)$/);
    if (m) lines.push(`PHOTO;ENCODING=b;TYPE=${m[1].toUpperCase()}:${m[2]}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVcf(data: PublicData) {
  const vcf = generateVcf(data);
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.profile.full_name.replace(/\s+/g, "_") || "contact"}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
