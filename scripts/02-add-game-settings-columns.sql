-- Migration: Add game settings columns to game_sessions table
-- Run this after the initial table creation

-- Add total_time_minutes column
ALTER TABLE public.game_sessions 
ADD COLUMN total_time_minutes INTEGER;

-- Add countdown_started_at column
ALTER TABLE public.game_sessions 
ADD COLUMN countdown_started_at TIMESTAMP WITH TIME ZONE;

-- Add game_end_mode column with check constraint
ALTER TABLE public.game_sessions 
ADD COLUMN game_end_mode TEXT CHECK (game_end_mode IN ('first_finish', 'wait_timer'));

-- Add allow_join_after_start column with default value
ALTER TABLE public.game_sessions 
ADD COLUMN allow_join_after_start BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.game_sessions.total_time_minutes IS 'Total time limit for the quiz in minutes';
COMMENT ON COLUMN public.game_sessions.countdown_started_at IS 'When the countdown before game start began';
COMMENT ON COLUMN public.game_sessions.game_end_mode IS 'Game end mode: first_finish or wait_timer';
COMMENT ON COLUMN public.game_sessions.allow_join_after_start IS 'Whether players can join after the game has started';