-- Sample public quiz data for testing dual mode system
-- This will populate the database with various public quizzes for testing

-- First, ensure we have some sample profiles (assuming they exist or will be created via auth)
-- Note: You'll need to replace these UUIDs with actual user IDs from your auth.users table

-- Sample public quizzes
DO $$
DECLARE
    sample_user_id UUID;
    umum_category_id UUID;
    sains_category_id UUID;
    sejarah_category_id UUID;
    teknologi_category_id UUID;
    quiz1_id UUID;
    quiz2_id UUID;
    quiz3_id UUID;
    quiz4_id UUID;
    q1_id UUID;
    q2_id UUID;
    q3_id UUID;
    q4_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO umum_category_id FROM quiz_categories WHERE name = 'Umum' LIMIT 1;
    SELECT id INTO sains_category_id FROM quiz_categories WHERE name = 'Sains' LIMIT 1;
    SELECT id INTO sejarah_category_id FROM quiz_categories WHERE name = 'Sejarah' LIMIT 1;
    SELECT id INTO teknologi_category_id FROM quiz_categories WHERE name = 'Teknologi' LIMIT 1;

    -- Create a sample user if profiles table is empty (for testing)
    INSERT INTO profiles (id, username, email) VALUES 
    (gen_random_uuid(), 'admin', 'admin@golekquiz.com')
    ON CONFLICT (username) DO NOTHING;
    
    SELECT id INTO sample_user_id FROM profiles WHERE username = 'admin' LIMIT 1;

    -- Insert sample public quizzes
    INSERT INTO quizzes (id, title, description, creator_id, is_public, category_id, difficulty_level, estimated_duration) VALUES
    (gen_random_uuid(), 'Pengetahuan Umum Indonesia', 'Quiz tentang pengetahuan umum seputar Indonesia, budaya, dan sejarah', sample_user_id, true, umum_category_id, 'medium', 15),
    (gen_random_uuid(), 'Matematika Dasar', 'Quiz matematika untuk tingkat SMA dengan berbagai topik', sample_user_id, true, sains_category_id, 'easy', 20),
    (gen_random_uuid(), 'Sejarah Dunia', 'Quiz tentang peristiwa-peristiwa penting dalam sejarah dunia', sample_user_id, true, sejarah_category_id, 'hard', 25),
    (gen_random_uuid(), 'Teknologi Modern', 'Quiz seputar perkembangan teknologi dan programming', sample_user_id, true, teknologi_category_id, 'medium', 18);

    -- Get quiz IDs for adding questions
    SELECT id INTO quiz1_id FROM quizzes WHERE title = 'Pengetahuan Umum Indonesia' LIMIT 1;
    SELECT id INTO quiz2_id FROM quizzes WHERE title = 'Matematika Dasar' LIMIT 1;
    SELECT id INTO quiz3_id FROM quizzes WHERE title = 'Sejarah Dunia' LIMIT 1;
    SELECT id INTO quiz4_id FROM quizzes WHERE title = 'Teknologi Modern' LIMIT 1;

    -- Questions for Quiz 1: Pengetahuan Umum Indonesia
    INSERT INTO questions (id, quiz_id, question_text, time_limit, points, order_index) VALUES
    (gen_random_uuid(), quiz1_id, 'Apa ibu kota Indonesia?', 20, 1000, 1),
    (gen_random_uuid(), quiz1_id, 'Siapa proklamator kemerdekaan Indonesia?', 30, 1000, 2),
    (gen_random_uuid(), quiz1_id, 'Berapa jumlah pulau di Indonesia?', 25, 1000, 3),
    (gen_random_uuid(), quiz1_id, 'Apa nama mata uang Indonesia?', 15, 1000, 4),
    (gen_random_uuid(), quiz1_id, 'Gunung tertinggi di Indonesia adalah?', 20, 1000, 5);

    -- Get question IDs for Quiz 1
    SELECT id INTO q1_id FROM questions WHERE quiz_id = quiz1_id AND order_index = 1;
    SELECT id INTO q2_id FROM questions WHERE quiz_id = quiz1_id AND order_index = 2;
    SELECT id INTO q3_id FROM questions WHERE quiz_id = quiz1_id AND order_index = 3;
    SELECT id INTO q4_id FROM questions WHERE quiz_id = quiz1_id AND order_index = 4;

    -- Answers for Quiz 1 Questions
    -- Question 1: Ibu kota Indonesia
    INSERT INTO answers (question_id, answer_text, is_correct, color, order_index) VALUES
    (q1_id, 'Jakarta', true, '#e74c3c', 1),
    (q1_id, 'Surabaya', false, '#3498db', 2),
    (q1_id, 'Bandung', false, '#f1c40f', 3),
    (q1_id, 'Medan', false, '#2ecc71', 4);

    -- Question 2: Proklamator kemerdekaan
    INSERT INTO answers (question_id, answer_text, is_correct, color, order_index) VALUES
    (q2_id, 'Soekarno dan Hatta', true, '#e74c3c', 1),
    (q2_id, 'Soekarno dan Sjahrir', false, '#3498db', 2),
    (q2_id, 'Hatta dan Sjahrir', false, '#f1c40f', 3),
    (q2_id, 'Soekarno saja', false, '#2ecc71', 4);

    -- Question 3: Jumlah pulau
    INSERT INTO answers (question_id, answer_text, is_correct, color, order_index) VALUES
    (q3_id, 'Lebih dari 17.000', true, '#e74c3c', 1),
    (q3_id, 'Sekitar 10.000', false, '#3498db', 2),
    (q3_id, 'Sekitar 5.000', false, '#f1c40f', 3),
    (q3_id, 'Lebih dari 25.000', false, '#2ecc71', 4);

    -- Question 4: Mata uang
    INSERT INTO answers (question_id, answer_text, is_correct, color, order_index) VALUES
    (q4_id, 'Rupiah', true, '#e74c3c', 1),
    (q4_id, 'Ringgit', false, '#3498db', 2),
    (q4_id, 'Peso', false, '#f1c40f', 3),
    (q4_id, 'Baht', false, '#2ecc71', 4);

    -- Questions for Quiz 2: Matematika Dasar
    INSERT INTO questions (id, quiz_id, question_text, time_limit, points, order_index) VALUES
    (gen_random_uuid(), quiz2_id, 'Berapa hasil dari 15 + 27?', 15, 1000, 1),
    (gen_random_uuid(), quiz2_id, 'Berapa akar kuadrat dari 144?', 20, 1000, 2),
    (gen_random_uuid(), quiz2_id, 'Berapa hasil dari 8 × 9?', 15, 1000, 3);

    -- Get question IDs for Quiz 2
    SELECT id INTO q1_id FROM questions WHERE quiz_id = quiz2_id AND order_index = 1;
    SELECT id INTO q2_id FROM questions WHERE quiz_id = quiz2_id AND order_index = 2;
    SELECT id INTO q3_id FROM questions WHERE quiz_id = quiz2_id AND order_index = 3;

    -- Answers for Quiz 2
    INSERT INTO answers (question_id, answer_text, is_correct, color, order_index) VALUES
    (q1_id, '42', true, '#e74c3c', 1),
    (q1_id, '41', false, '#3498db', 2),
    (q1_id, '43', false, '#f1c40f', 3),
    (q1_id, '40', false, '#2ecc71', 4),
    
    (q2_id, '12', true, '#e74c3c', 1),
    (q2_id, '11', false, '#3498db', 2),
    (q2_id, '13', false, '#f1c40f', 3),
    (q2_id, '14', false, '#2ecc71', 4),
    
    (q3_id, '72', true, '#e74c3c', 1),
    (q3_id, '71', false, '#3498db', 2),
    (q3_id, '73', false, '#f1c40f', 3),
    (q3_id, '81', false, '#2ecc71', 4);

    -- Questions for Quiz 3: Sejarah Dunia
    INSERT INTO questions (id, quiz_id, question_text, time_limit, points, order_index) VALUES
    (gen_random_uuid(), quiz3_id, 'Kapan Perang Dunia II berakhir?', 25, 1000, 1),
    (gen_random_uuid(), quiz3_id, 'Siapa yang membangun Tembok Berlin?', 30, 1000, 2);

    -- Questions for Quiz 4: Teknologi Modern
    INSERT INTO questions (id, quiz_id, question_text, time_limit, points, order_index) VALUES
    (gen_random_uuid(), quiz4_id, 'Apa kepanjangan dari HTML?', 20, 1000, 1),
    (gen_random_uuid(), quiz4_id, 'Siapa pendiri Facebook?', 15, 1000, 2);

    -- Add some sample ratings
    INSERT INTO quiz_ratings (quiz_id, user_id, rating, review) VALUES
    (quiz1_id, sample_user_id, 5, 'Quiz yang sangat bagus untuk belajar tentang Indonesia!'),
    (quiz2_id, sample_user_id, 4, 'Matematika yang tidak terlalu sulit, cocok untuk pemula'),
    (quiz3_id, sample_user_id, 5, 'Menantang dan edukatif!'),
    (quiz4_id, sample_user_id, 4, 'Quiz teknologi yang up to date');

    -- Update play counts to make it look realistic
    UPDATE quizzes SET play_count = 150 WHERE id = quiz1_id;
    UPDATE quizzes SET play_count = 89 WHERE id = quiz2_id;
    UPDATE quizzes SET play_count = 203 WHERE id = quiz3_id;
    UPDATE quizzes SET play_count = 97 WHERE id = quiz4_id;

    RAISE NOTICE 'Sample public quiz data has been inserted successfully!';
END $$;

-- Update some quizzes to have cover images (using placeholder URLs)
UPDATE quizzes SET cover_image = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500' WHERE title = 'Pengetahuan Umum Indonesia';
UPDATE quizzes SET cover_image = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500' WHERE title = 'Matematika Dasar';
UPDATE quizzes SET cover_image = 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500' WHERE title = 'Sejarah Dunia';
UPDATE quizzes SET cover_image = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500' WHERE title = 'Teknologi Modern';

COMMENT ON SCRIPT IS 'Sample data for testing dual mode quiz system - includes public quizzes with questions, answers, and ratings';