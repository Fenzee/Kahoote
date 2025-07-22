-- Create the game_chat_messages table
CREATE TABLE IF NOT EXISTS game_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_session_id ON game_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_game_chat_messages_created_at ON game_chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE game_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_chat_messages
-- 1. Allow anyone to read messages for a game session they're participating in
CREATE POLICY "Anyone can view messages for sessions they're in" ON game_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM game_participants 
            WHERE game_participants.session_id = game_chat_messages.session_id 
            AND (
                game_participants.user_id = auth.uid() OR 
                (SELECT host_id FROM game_sessions WHERE id = game_chat_messages.session_id) = auth.uid()
            )
        ) OR 
        EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE game_sessions.id = game_chat_messages.session_id 
            AND game_sessions.host_id = auth.uid()
        )
    );

-- 2. Allow participants to insert messages
CREATE POLICY "Participants can insert messages" ON game_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM game_participants 
            WHERE game_participants.session_id = game_chat_messages.session_id 
            AND (
                game_participants.user_id = auth.uid() OR
                (SELECT host_id FROM game_sessions WHERE id = game_chat_messages.session_id) = auth.uid()
            )
        ) OR 
        EXISTS (
            SELECT 1 FROM game_sessions 
            WHERE game_sessions.id = game_chat_messages.session_id 
            AND game_sessions.host_id = auth.uid()
        )
    );

-- 3. Allow users to update only their own messages
CREATE POLICY "Users can update own messages" ON game_chat_messages
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- 4. Allow users to delete only their own messages
CREATE POLICY "Users can delete own messages" ON game_chat_messages
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Enable realtime for chat messages
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_chat_messages;

-- Create function to notify about new chat messages
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_chat_message',
    json_build_object(
      'id', NEW.id,
      'session_id', NEW.session_id,
      'nickname', NEW.nickname,
      'message', NEW.message,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new chat message notifications
CREATE TRIGGER trigger_new_chat_message
AFTER INSERT ON game_chat_messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_chat_message(); 