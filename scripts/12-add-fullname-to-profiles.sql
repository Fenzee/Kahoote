-- Add fullname column to profiles table
-- This column is required by the application but was missing from the schema

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fullname TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.fullname IS 'User full name or display name';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_fullname ON public.profiles (fullname);

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;

COMMIT;