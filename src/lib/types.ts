export type Visibility = {
  contact: boolean;
  social: boolean;
  address: boolean;
  documents: boolean;
  bio: boolean;
  cover: boolean;
};

export type Certificate = { label: string; url: string };

export type PublicProfile = {
  full_name: string;
  designation: string;
  company: string;
  bio: string;
  profile_photo: string | null;
  cover_photo: string | null;
  address: string;
  map_url: string | null;
  cv_url: string | null;
  cv_password_enabled: boolean;
  portfolio_url: string | null;
  certificates: Certificate[];
  theme_primary: string;
  theme_accent: string;
  button_style: string;
  card_radius: string;
  visibility: Visibility;
};

export type ContactItem = {
  id: string;
  kind: "phone" | "email" | "whatsapp" | "website";
  label: string;
  value: string;
  hidden: boolean;
  sort_order: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  hidden: boolean;
  sort_order: number;
};

export type PublicData = {
  profile: PublicProfile;
  contacts: ContactItem[];
  socials: SocialLink[];
};

export type AdminData = PublicData & {
  hasPasscode: boolean;
};
