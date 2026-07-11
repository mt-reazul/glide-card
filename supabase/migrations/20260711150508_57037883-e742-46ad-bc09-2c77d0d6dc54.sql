
CREATE TABLE public.profile (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  profile_photo TEXT,
  cover_photo TEXT,
  address TEXT NOT NULL DEFAULT '',
  map_url TEXT,
  cv_url TEXT,
  cv_password_hash TEXT,
  cv_password_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  portfolio_url TEXT,
  certificates JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_primary TEXT NOT NULL DEFAULT '#2563eb',
  theme_accent TEXT NOT NULL DEFAULT '#0ea5e9',
  button_style TEXT NOT NULL DEFAULT 'rounded',
  card_radius TEXT NOT NULL DEFAULT '2xl',
  visibility JSONB NOT NULL DEFAULT '{"contact":true,"social":true,"address":true,"documents":true,"bio":true,"cover":true}'::jsonb,
  admin_passcode_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile TO anon, authenticated;
GRANT ALL ON public.profile TO service_role;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profile" ON public.profile FOR SELECT USING (true);

CREATE TABLE public.contact_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('phone','email','whatsapp','website')),
  label TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contact_items TO anon, authenticated;
GRANT ALL ON public.contact_items TO service_role;
ALTER TABLE public.contact_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible contact items" ON public.contact_items FOR SELECT USING (NOT hidden);

CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_links TO anon, authenticated;
GRANT ALL ON public.social_links TO service_role;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible social links" ON public.social_links FOR SELECT USING (NOT hidden);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profile_set_updated_at BEFORE UPDATE ON public.profile
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profile (id, full_name, designation, company, bio, address, map_url, portfolio_url, certificates)
VALUES (
  1,
  'Alex Morgan',
  'Product Designer & Developer',
  'Nordic Studio',
  'Crafting beautiful, human-centered digital experiences. Available for freelance projects and collaborations worldwide.',
  '221B Baker Street, London, UK',
  'https://maps.google.com/?q=221B+Baker+Street+London',
  'https://example.com/portfolio',
  '[{"label":"Design Certification","url":"https://example.com/cert1"},{"label":"UX Award 2024","url":"https://example.com/cert2"}]'::jsonb
);
