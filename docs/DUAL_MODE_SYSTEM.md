# Dual Mode System - GolekQuiz

Sistem dual mode telah berhasil diimplementasikan di GolekQuiz untuk memberikan pengalaman bermain quiz yang lebih beragam. Sistem ini memungkinkan pengguna untuk memilih antara dua mode permainan:

## 🎮 Mode Permainan

### 1. Mode Private Quiz (Quiz dari Teman)
- **Deskripsi**: Mode tradisional di mana pengguna bergabung dengan game quiz yang dibuat oleh teman menggunakan PIN
- **Cara Akses**: Masukkan PIN game di halaman `/play-mode`
- **Fitur**:
  - Real-time multiplayer experience
  - Quiz khusus yang dibuat teman
  - Sistem scoring kompetitif
  - Live leaderboard
  - Interactive chat (jika diaktifkan)

### 2. Mode Public Quiz (Quiz Publik)
- **Deskripsi**: Mode baru di mana pengguna dapat browsing dan memainkan koleksi quiz publik
- **Cara Akses**: Klik "Jelajahi Quiz Publik" di halaman `/play-mode`
- **Fitur**:
  - Ribuan quiz dari berbagai kategori
  - Sistem rating dan review
  - Filter berdasarkan kategori, tingkat kesulitan
  - Mode latihan mandiri (practice mode)
  - Bookmark quiz favorit

## 🏗️ Struktur Database

### Tabel Baru

#### `quiz_categories`
```sql
CREATE TABLE public.quiz_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_ratings`
```sql
CREATE TABLE public.quiz_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);
```

#### `quiz_bookmarks`
```sql
CREATE TABLE public.quiz_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);
```

### Kolom Baru di Tabel Existing

#### `quizzes`
- `category_id`: Referensi ke kategori quiz
- `difficulty_level`: Level kesulitan (easy, medium, hard)
- `estimated_duration`: Estimasi durasi dalam menit
- `play_count`: Jumlah kali dimainkan
- `rating_average`: Rating rata-rata
- `rating_count`: Jumlah rating

#### `game_sessions`
- `session_type`: Tipe sesi (private, public)
- `is_practice_mode`: Apakah mode latihan

## 🛣️ Routing dan Navigation

### Halaman Baru
1. **`/play-mode`** - Halaman pemilihan mode permainan
2. **`/play-mode/browse`** - Browse public quiz dengan filter
3. **`/host/public/[id]`** - Host page untuk public quiz

### Flow Navigation
```
Home Page → "Main Quiz" Button → /play-mode
                                     ├─ Private Quiz (dengan PIN) → /join → /play/[id] → /play-active/[id]
                                     └─ Public Quiz Browse → /play-mode/browse → /host/public/[id] → /play-active/[id]
```

## 📱 UI Components

### Halaman Play Mode (`/play-mode`)
- Dua kartu pilihan mode yang eye-catching
- Input PIN untuk private quiz
- Navigasi ke public quiz browser
- Animasi dan efek hover yang smooth

### Halaman Browse Public Quiz (`/play-mode/browse`)
- Grid layout responsif untuk quiz cards
- Filter toolbar dengan:
  - Search by title/description/creator
  - Category dropdown
  - Difficulty level filter
  - Sort options (popular, rating, newest, oldest)
- Quiz cards menampilkan:
  - Category icon dan warna
  - Rating bintang
  - Play count
  - Estimated duration
  - Difficulty badge
  - Bookmark functionality

### Halaman Host Public Quiz (`/host/public/[id]`)
- Detail quiz lengkap dengan cover image
- Stats quiz (jumlah pertanyaan, durasi, rating, play count)
- Info mode latihan
- Tombol mulai quiz

## 🔧 Setup dan Installation

### 1. Database Setup
Jalankan script SQL dalam urutan berikut:
```bash
# Dual mode system schema
psql -d your_database -f scripts/14-add-dual-mode-system.sql

# Sample data (opsional)
psql -d your_database -f scripts/15-sample-public-quiz-data.sql
```

### 2. Environment Variables
Pastikan variabel environment berikut sudah diset:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Dependencies
Semua dependencies yang diperlukan sudah tersedia di `package.json`:
- `@supabase/supabase-js` - Database client
- `@radix-ui/react-select` - Select components
- `lucide-react` - Icons
- `framer-motion` - Animations

## 🎯 Fitur Utama

### Public Quiz Browser
- **Pencarian dan Filter**: Pengguna dapat mencari quiz berdasarkan judul, deskripsi, atau pembuat
- **Kategori**: Quiz diorganisir dalam 10 kategori utama
- **Rating System**: Pengguna dapat memberikan rating dan review
- **Bookmark**: Simpan quiz favorit untuk akses cepat
- **Sorting**: Urutkan berdasarkan popularitas, rating, atau tanggal

### Practice Mode
- **Solo Play**: Bermain sendiri tanpa kompetitor
- **No Time Pressure**: Tidak ada timer global yang membatasi
- **Instant Feedback**: Langsung lihat hasil setelah selesai

### Backward Compatibility
- Sistem lama (private quiz dengan PIN) tetap berfungsi normal
- Tidak ada breaking changes pada fitur existing
- Database migration aman dengan `IF NOT EXISTS` checks

## 🔄 Integration Points

### Dengan Sistem Existing
- `play-active` page tetap digunakan untuk kedua mode
- `game_sessions` table diperluas untuk mendukung session types
- `calculate_score` function tetap digunakan
- Realtime features tetap berfungsi

### Supabase Integration
- Row Level Security (RLS) untuk data privacy
- Real-time subscriptions untuk live updates
- Storage untuk quiz cover images (jika diperlukan)

## 📊 Analytics dan Metrics

### Tracking yang Tersedia
- Play count per quiz
- Rating average dan count
- User engagement metrics
- Popular categories
- Search patterns

### Database Views
- `public_quiz_browse`: View optimized untuk browsing dengan statistik

## 🚀 Future Enhancements

### Planned Features
1. **Quiz Collections**: Grup quiz berdasarkan tema
2. **Advanced Analytics**: Dashboard untuk quiz creators
3. **Social Features**: Follow creators, share results
4. **AI Recommendations**: Personalized quiz suggestions
5. **Multiplayer Public Quiz**: Public rooms dengan multiple players

### Technical Improvements
1. **Caching**: Redis untuk popular quiz data
2. **CDN**: Image optimization untuk cover images
3. **Search**: Elasticsearch untuk advanced search
4. **Performance**: Database indexing optimization

## 🐛 Troubleshooting

### Common Issues

1. **Public quiz tidak muncul**
   - Pastikan `is_public = true` di database
   - Check RLS policies
   - Verify category assignments

2. **Rating tidak update**
   - Check trigger `quiz_rating_update_trigger`
   - Verify permissions di Supabase

3. **Images tidak load**
   - Pastikan URL valid di `cover_image`
   - Check CORS settings

### Debug Commands
```sql
-- Check public quiz data
SELECT * FROM public_quiz_browse LIMIT 10;

-- Check categories
SELECT * FROM quiz_categories WHERE is_active = true;

-- Check ratings
SELECT quiz_id, AVG(rating), COUNT(*) FROM quiz_ratings GROUP BY quiz_id;
```

## 📝 Maintenance

### Regular Tasks
1. Monitor popular quizzes dan update featured lists
2. Moderate user reviews dan ratings
3. Update category icons dan colors as needed
4. Archive inactive quizzes
5. Backup sample data untuk development

### Performance Monitoring
- Watch query performance pada public_quiz_browse view
- Monitor database size growth
- Track user engagement metrics

---

## 🎉 Kesimpulan

Dual mode system berhasil mengubah GolekQuiz dari platform quiz multiplayer sederhana menjadi platform comprehensive dengan:
- **2 mode permainan** yang distinct
- **Rich public quiz library** dengan filtering canggih
- **Backward compatibility** sempurna
- **Modern UI/UX** dengan animasi smooth
- **Scalable architecture** untuk future features

Sistem ini siap untuk production dan dapat di-extend sesuai kebutuhan bisnis kedepannya.