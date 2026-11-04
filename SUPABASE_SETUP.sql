-- ========================================================
-- DOCUSCAN SUPABASE VERİTABANI VE GÜVENLİK POLİTİKALARI (RLS)
-- ========================================================
-- Bu scripti Supabase Dashboard > SQL Editor sekmesine yapıştırıp RUN diyerek çalıştırabilirsiniz.

-- 1. KULLANICILAR PROFİL TABLOSU
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_pro BOOLEAN DEFAULT true, -- 7 günlük deneme ile varsayılan açık
  pro_ends_at BIGINT,
  trial_ends_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 2. TEK KULLANIMLIK KUPONLAR TABLOSU
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id TEXT,
  used_by_user_email TEXT,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);

-- 3. FİYATLANDIRMA PAKETLERİ TABLOSU
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT '₺',
  duration_days INTEGER NOT NULL,
  period_label TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Politikalar:
-- Herkes aktif fiyatları okuyabilir:
CREATE POLICY "Public read pricing" ON public.pricing_plans
  FOR SELECT USING (is_active = true);

-- Kullanıcılar kendi profillerini görebilir ve güncelleyebilir:
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Kuponları okuma ve tek seferlik kullanma:
CREATE POLICY "Read coupons" ON public.coupons
  FOR SELECT USING (true);

-- Otomatik Yeni Kullanıcı Kayıt Trigger'ı (İlk 1 Hafta / 7 Gün Ücretsiz Deneme Tanımlar)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  trial_days_ms BIGINT := 7 * 86400000;
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, role, is_pro, pro_ends_at, trial_ends_at, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email IN ('yldzsalih27@gmail.com', 'salih.yildiz@gmail.com') THEN 'admin' ELSE 'user' END,
    true,
    now_ms + trial_days_ms,
    now_ms + trial_days_ms,
    now_ms
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
