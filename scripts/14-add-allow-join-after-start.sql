-- Migration: Add allow_join_after_start column to game_sessions table
-- Kolom ini menentukan apakah user boleh join setelah game dimulai (status 'active')

ALTER TABLE public.game_sessions 
ADD COLUMN IF NOT EXISTS allow_join_after_start BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.game_sessions.allow_join_after_start IS 
'Jika true, user masih bisa join ke game meskipun status sudah active.';