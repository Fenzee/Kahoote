"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Proses callback OAuth dari provider
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error auth callback:", error);
        router.push("/auth/login?error=Authentication failed");
        return;
      }
      
      if (data.session) {
        // Cek apakah user sudah memiliki profil
        await ensureUserProfile(data.session.user);
        
        // Berhasil login, redirect ke dashboard
        router.push("/dashboard");
      } else {
        // Tidak ada session, kembali ke login
        router.push("/auth/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  // Fungsi untuk memastikan user memiliki profil
  const ensureUserProfile = async (user: any) => {
    if (!user) return;
    
    try {
      // Cek apakah profil sudah ada
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      
      // Jika profil tidak ditemukan, buat profil baru
      if (profileError && profileError.code === "PGRST116") {
        console.log("Creating new profile for OAuth user");
        
        // Ekstrak username dari email
        let username = "";
        if (user.email) {
          username = user.email.split('@')[0];
          
          // Tambahkan angka random jika username sudah ada
          const { data: usernameExists } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();
            
          if (usernameExists) {
            username = `${username}${Math.floor(Math.random() * 1000)}`;
          }
        } else {
          username = `user_${Math.floor(Math.random() * 10000)}`;
        }
        
        // Buat profil baru
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: username,
            email: user.email || "",
            fullname: user.user_metadata?.full_name || username,
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
        }
      }
    } catch (error) {
      console.error("Error ensuring user profile:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-blue-600">Memproses login...</p>
      </div>
    </div>
  );
}