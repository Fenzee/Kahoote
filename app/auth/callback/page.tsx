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
        // Berhasil login, redirect ke dashboard
        router.push("/dashboard");
      } else {
        // Tidak ada session, kembali ke login
        router.push("/auth/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-blue-600">Memproses login...</p>
      </div>
    </div>
  );
}