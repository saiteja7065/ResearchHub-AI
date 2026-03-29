-- migration_4_tiers.sql
-- Adds subscription_tier to profiles for SaaS monetization limits

-- 1. Add subscription_tier column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'freemium';

-- 2. Update existing profiles
UPDATE public.profiles 
SET subscription_tier = 'freemium' 
WHERE subscription_tier IS NULL;

-- 3. Modify the handle_new_user trigger function to include the tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, subscription_tier)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'freemium'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
