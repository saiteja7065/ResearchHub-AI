-- 1. Add missing subscription_tier and full_name columns to public.profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'freemium';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Update existing profiles with default tier if they are null
UPDATE public.profiles 
SET subscription_tier = 'freemium' 
WHERE subscription_tier IS NULL;

-- 3. Modify trigger function to insert full_name and subscription_tier on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, subscription_tier)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'freemium'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    subscription_tier = COALESCE(profiles.subscription_tier, EXCLUDED.subscription_tier);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
