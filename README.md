# Kahoote

Aplikasi quiz interaktif berbasis web yang terinspirasi dari Kahoot.

## Fitur

- Buat quiz dengan berbagai kategori dan bahasa
- Tambahkan pertanyaan secara manual atau dengan bantuan AI
- Host quiz untuk dimainkan secara real-time
- Mode permainan solo
- Leaderboard dan statistik permainan
- Tampilan responsif untuk desktop dan mobile

## Teknologi

- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth, Database, Realtime)
- Tailwind CSS
- Shadcn UI
- Cohere AI untuk generasi pertanyaan

## Konfigurasi

### Supabase

1. Buat project di [Supabase](https://supabase.com)
2. Jalankan script SQL di folder `scripts` secara berurutan untuk membuat skema database
3. Salin URL dan anon key dari Supabase ke file `.env.local`

### Cohere AI

1. Daftar di [Cohere](https://cohere.com) untuk mendapatkan API key
2. Salin API key ke file `.env.local` dengan format:
   ```
   COHERE_API_KEY=your-api-key
   ```

## Instalasi

```bash
# Clone repository
git clone https://github.com/yourusername/kahoote.git
cd kahoote

# Install dependencies
npm install
# or
pnpm install

# Buat file .env.local dan isi dengan kredensial yang diperlukan
cp .env.example .env.local

# Jalankan development server
npm run dev
# or
pnpm dev
```

## Penggunaan

1. Buka `http://localhost:3000` di browser
2. Daftar atau masuk ke akun
3. Buat quiz baru atau jelajahi quiz yang tersedia
4. Host quiz atau mainkan dalam mode solo

## Struktur Database

```
profiles: Profil pengguna (extends auth.users)
quizzes: Data quiz (judul, deskripsi, kategori, bahasa)
questions: Pertanyaan quiz
answers: Jawaban untuk setiap pertanyaan
game_sessions: Sesi permainan
game_participants: Peserta dalam sesi permainan
game_responses: Jawaban peserta dalam permainan
```

## Lisensi

MIT