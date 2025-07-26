# Fix untuk Error Foreign Key Constraint "profiles_id_fkey"

## Masalah
Error `insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"` terjadi karena:

1. **Missing Column**: Table `profiles` tidak memiliki column `fullname`, tetapi aplikasi mencoba insert data ke column tersebut.
2. **Timing Issue**: Profile dibuat sebelum user benar-benar tersimpan di `auth.users`.

## Solusi

### 1. Tambahkan Column `fullname` ke Table Profiles

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Add fullname column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fullname TEXT;

-- Add comment to the column  
COMMENT ON COLUMN public.profiles.fullname IS 'User full name or display name';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_fullname ON public.profiles (fullname);

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;

COMMIT;
```

### 2. Struktur Table Profiles yang Benar

Setelah migration, table `profiles` harus memiliki columns:
- `id` (UUID, Foreign Key ke auth.users)
- `username` (TEXT, UNIQUE, NOT NULL)
- `email` (TEXT, NOT NULL) 
- `fullname` (TEXT) - **COLUMN BARU**
- `avatar_url` (TEXT)
- `country` (TEXT)
- `school` (TEXT)
- `phone` (TEXT)
- `birthdate` (DATE)
- `address` (TEXT)
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)
- `location` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 3. Code Changes yang Sudah Dilakukan

#### A. Fixed Auth Callback (`app/auth/callback/page.tsx`)
- Tambahkan proper error handling
- Pastikan profile creation menggunakan semua field yang diperlukan
- Tambahkan logging untuk debugging

#### B. Fixed Auth Context (`contexts/auth-context.tsx`)
- Perbaiki manual signup untuk handle `fullname` field
- Tambahkan proper error handling

#### C. Fixed Login Page (`app/auth/login/page.tsx`)
- Tambahkan useAuth hook
- Tambahkan auto-redirect ke dashboard jika user sudah login

### 4. Flow Registrasi yang Benar

#### Manual Registration:
1. User mengisi form registrasi → `app/auth/register/page.tsx`
2. Form memanggil `signUp()` di `contexts/auth-context.tsx`
3. Supabase auth membuat user di `auth.users`
4. Profile dibuat di `public.profiles` dengan semua field
5. User di-redirect ke dashboard via useEffect

#### Google OAuth Registration:
1. User klik "Sign in with Google" → `app/auth/login/page.tsx` atau `app/auth/register/page.tsx`
2. Redirect ke Google OAuth
3. Google callback ke `app/auth/callback/page.tsx`
4. Check apakah profile sudah ada
5. Jika belum ada, buat profile baru dengan data dari `user_metadata`
6. Redirect ke dashboard

### 5. Testing

Setelah menjalankan migration SQL, test:

1. **Manual Registration**:
   - Buka `/auth/register`
   - Isi form lengkap
   - Submit → harus redirect ke `/dashboard`

2. **Google OAuth**:
   - Buka `/auth/login`
   - Klik "Sign in with Google"
   - Login dengan Google → harus redirect ke `/dashboard`

3. **Re-login**:
   - Logout dan login lagi
   - Harus bisa masuk tanpa error

### 6. Troubleshooting

Jika masih ada error:

1. **Check Supabase Logs**: Lihat di Dashboard → Logs
2. **Check Browser Console**: Lihat error JavaScript
3. **Check Profile Table**: Query manual di SQL Editor:
   ```sql
   SELECT * FROM public.profiles LIMIT 5;
   ```

### 7. Environment Variables Required

Pastikan `.env.local` memiliki:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional untuk migration
```

## Status
- ✅ Code fixes applied
- ⚠️ Database migration needs to be run manually
- ✅ Registration flow improved
- ✅ OAuth callback fixed
- ✅ Dashboard redirection added