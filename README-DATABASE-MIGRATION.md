# Database Migration untuk Game Settings

## Overview
Migration ini menambahkan kolom-kolom baru ke tabel `game_sessions` untuk mendukung fitur pengaturan permainan yang lebih lengkap.

## File Migration
File migration: `scripts/02-add-game-settings-columns.sql`

## Kolom yang Ditambahkan

### 1. `total_time_minutes` (INTEGER)
- **Deskripsi**: Total waktu limit untuk quiz dalam menit
- **Contoh**: 10, 30, 60 menit
- **Default**: NULL

### 2. `countdown_started_at` (TIMESTAMP WITH TIME ZONE)
- **Deskripsi**: Waktu ketika countdown sebelum game dimulai
- **Contoh**: 2024-01-15 10:30:00+07
- **Default**: NULL

### 3. `game_end_mode` (TEXT)
- **Deskripsi**: Mode akhir permainan
- **Nilai yang diizinkan**: 
  - `'first_finish'` - Game berakhir ketika pemain pertama selesai
  - `'wait_timer'` - Game berakhir ketika timer habis
- **Default**: NULL
- **Constraint**: CHECK (game_end_mode IN ('first_finish', 'wait_timer'))

### 4. `allow_join_after_start` (BOOLEAN)
- **Deskripsi**: Apakah pemain dapat bergabung setelah game dimulai
- **Nilai**: true/false
- **Default**: false

## Cara Menjalankan Migration

### 1. Melalui Supabase Dashboard
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Buka SQL Editor
4. Copy dan paste isi file `scripts/02-add-game-settings-columns.sql`
5. Klik "Run" untuk menjalankan migration

### 2. Melalui Command Line
```bash
# Jika menggunakan psql
psql -h your-host -U your-user -d your-database -f scripts/02-add-game-settings-columns.sql

# Jika menggunakan Supabase CLI
supabase db push
```

## Verifikasi Migration
Setelah menjalankan migration, Anda dapat memverifikasi dengan query berikut:

```sql
-- Cek struktur tabel
\d game_sessions

-- Cek kolom baru
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'game_sessions' 
AND column_name IN ('total_time_minutes', 'countdown_started_at', 'game_end_mode', 'allow_join_after_start');
```

## Rollback (Jika Diperlukan)
Jika perlu rollback, gunakan query berikut:

```sql
-- Hapus kolom yang ditambahkan
ALTER TABLE public.game_sessions DROP COLUMN IF EXISTS total_time_minutes;
ALTER TABLE public.game_sessions DROP COLUMN IF EXISTS countdown_started_at;
ALTER TABLE public.game_sessions DROP COLUMN IF EXISTS game_end_mode;
ALTER TABLE public.game_sessions DROP COLUMN IF EXISTS allow_join_after_start;
```

## Fitur yang Didukung
Setelah migration berhasil, aplikasi akan mendukung:

1. **Pengaturan Waktu Quiz** - Host dapat mengatur berapa lama quiz akan berlangsung
2. **Mode Akhir Permainan** - Pilihan antara "Pertama Selesai" atau "Tunggu Timer"
3. **Izin Bergabung Setelah Game Dimulai** - Kontrol apakah pemain baru dapat bergabung setelah game aktif
4. **Countdown Timer** - Timer countdown sebelum game dimulai

## Catatan Penting
- Migration ini **tidak merusak data existing**
- Semua kolom baru bersifat **nullable** sehingga tidak akan mempengaruhi data lama
- Pastikan backup database sebelum menjalankan migration di production