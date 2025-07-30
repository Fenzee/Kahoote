-- Add dual mode system support for GolekQuiz
-- This enables both private quiz (from friends) and public quiz browsing

-- Add public quiz categories for better organization
CREATE TABLE IF NOT EXISTS public.quiz_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category relationship to quizzes
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.quiz_categories(id),
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 10, -- in minutes
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create quiz ratings table for public quiz rating system
CREATE TABLE IF NOT EXISTS public.quiz_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

-- Create quiz bookmarks table for users to save favorite public quizzes
CREATE TABLE IF NOT EXISTS public.quiz_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

-- Add game session types to distinguish between private and public quiz games
ALTER TABLE public.game_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'private' CHECK (session_type IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS is_practice_mode BOOLEAN DEFAULT false;

-- Insert default categories for public quizzes
INSERT INTO public.quiz_categories (name, description, icon, color) VALUES
('Umum', 'Pengetahuan umum dan trivia', 'HelpCircle', '#3B82F6'),
('Sains', 'Fisika, Kimia, Biologi, dan Matematika', 'Atom', '#10B981'),
('Sejarah', 'Sejarah dunia dan Indonesia', 'Clock', '#F59E0B'),
('Olahraga', 'Sepak bola, basket, dan olahraga lainnya', 'Trophy', '#EF4444'),
('Teknologi', 'Komputer, programming, dan teknologi', 'Cpu', '#8B5CF6'),
('Bahasa', 'Bahasa Indonesia, Inggris, dan bahasa lainnya', 'BookOpen', '#EC4899'),
('Geografi', 'Negara, ibu kota, dan geografi dunia', 'MapPin', '#14B8A6'),
('Hiburan', 'Film, musik, dan pop culture', 'Music', '#F97316'),
('Agama', 'Pengetahuan agama dan moral', 'Heart', '#6366F1'),
('Lainnya', 'Kategori lain yang tidak masuk di atas', 'MoreHorizontal', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Function to update quiz rating average
CREATE OR REPLACE FUNCTION update_quiz_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quizzes 
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating), 0.0) 
      FROM public.quiz_ratings 
      WHERE quiz_id = COALESCE(NEW.quiz_id, OLD.quiz_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.quiz_ratings 
      WHERE quiz_id = COALESCE(NEW.quiz_id, OLD.quiz_id)
    )
  WHERE id = COALESCE(NEW.quiz_id, OLD.quiz_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update quiz ratings
DROP TRIGGER IF EXISTS quiz_rating_update_trigger ON public.quiz_ratings;
CREATE TRIGGER quiz_rating_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_rating();

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(quiz_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.quizzes 
  SET play_count = play_count + 1 
  WHERE id = quiz_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create view for public quiz browsing with statistics
CREATE OR REPLACE VIEW public.public_quiz_browse AS
SELECT 
  q.id,
  q.title,
  q.description,
  q.cover_image,
  q.is_public,
  q.category_id,
  q.difficulty_level,
  q.estimated_duration,
  q.play_count,
  q.rating_average,
  q.rating_count,
  q.created_at,
  q.updated_at,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  p.username as creator_username,
  (SELECT COUNT(*) FROM public.questions WHERE quiz_id = q.id) as question_count
FROM public.quizzes q
LEFT JOIN public.quiz_categories c ON q.category_id = c.id
LEFT JOIN public.profiles p ON q.creator_id = p.id
WHERE q.is_public = true
ORDER BY q.play_count DESC, q.rating_average DESC, q.created_at DESC;

COMMENT ON TABLE public.quiz_categories IS 'Categories for organizing public quizzes';
COMMENT ON TABLE public.quiz_ratings IS 'User ratings and reviews for public quizzes';
COMMENT ON TABLE public.quiz_bookmarks IS 'User bookmarks for favorite public quizzes';
COMMENT ON VIEW public.public_quiz_browse IS 'View for browsing public quizzes with statistics';