"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Slack, Users, ArrowBigLeft } from "lucide-react";
import Link from "next/link";

export default function JoinGamePage() {
  const [gamePin, setGamePin] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-fill game PIN if provided in URL
  useEffect(() => {
    const pinFromUrl = searchParams.get("pin");
    if (pinFromUrl) {
      setGamePin(pinFromUrl);
    }
  }, [searchParams]);

  // const joinGame = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!gamePin.trim() || !nickname.trim()) return;

  //   setLoading(true);
  //   setError("");

  //   try {
  //     // Check if game exists and is waiting
  //     const { data: session, error: sessionError } = await supabase
  //       .from("game_sessions")
  //       .select("id, status, quiz_id")
  //       .eq("game_pin", gamePin.trim())
  //       .eq("status", "waiting")
  //       .single();

  //     if (sessionError || !session) {
  //       setError("Game PIN tidak valid atau game sudah dimulai");
  //       return;
  //     }

  //     // Check if nickname is already taken in this session
  //     const { data: existingParticipant } = await supabase
  //       .from("game_participants")
  //       .select("id")
  //       .eq("session_id", session.id)
  //       .eq("nickname", nickname.trim())
  //       .single();

  //     if (existingParticipant) {
  //       setError("Nickname sudah digunakan, pilih nickname lain");
  //       return;
  //     }

  //     const { data: profile, error: profileError } = await supabase
  //       .from("profiles")
  //       .select("username")
  //       .eq("id", user.id) // gunakan user.id dari session Supabase auth
  //       .single();

  //     if (profileError || !profile) {
  //       setError("Gagal mengambil username.");
  //       return;
  //     }

  //     // Join the game
  //     const { data: participant, error: participantError } = await supabase
  //       .from("game_participants")
  //       .insert({
  //         session_id: session.id,
  //         user_id: user.id, // Anonymous player
  //         nickname: profile.username,
  //       })
  //       .select()
  //       .single();

  //     if (participantError) throw participantError;

  //     console.log("Participant created:", participant); // Debug log
  //     console.log("Session ID:", session.id); // Debug log

  //     // Redirect to game lobby
  //     router.push(`/play/${session.id}?participant=${participant.id}`);
  //   } catch (error: any) {
  //     console.error("Error joining game:", error);
  //     setError("Gagal bergabung ke game. Silakan coba lagi.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamePin.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Ambil user dari session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Kamu harus login untuk join game.");
        return;
      }

      // Ambil username dari profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setError("Gagal mengambil username.");
        return;
      }

      // Cek session game
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, quiz_id")
        .eq("game_pin", gamePin.trim())
        .eq("status", "waiting")
        .single();

      if (sessionError || !session) {
        setError("Game PIN tidak valid atau game sudah dimulai");
        return;
      }

      // Cek apakah username sudah dipakai
      const { data: existingParticipant } = await supabase
        .from("game_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("nickname", profile.username)
        .single();

      if (existingParticipant) {
        setError("Username kamu sudah dipakai di game ini.");
        return;
      }

      // Join game dengan username
      const { data: participant, error: participantError } = await supabase
        .from("game_participants")
        .insert({
          session_id: session.id,
          user_id: user.id,
          nickname: profile.username,
        })
        .select()
        .single();

      if (participantError) throw participantError;

      router.push(`/play/${session.id}?participant=${participant.id}`);
    } catch (error: any) {
      console.error("Error joining game:", error);
      setError("Gagal bergabung ke game. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // const joinGame = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!gamePin.trim() || !nickname.trim()) return;

  //   setLoading(true);
  //   setError("");

  //   try {
  //     // Check if game exists and is waiting
  //     const { data: session, error: sessionError } = await supabase
  //       .from("game_sessions")
  //       .select("id, status, quiz_id")
  //       .eq("game_pin", gamePin.trim())
  //       .eq("status", "waiting")
  //       .single();

  //     if (sessionError || !session) {
  //       setError("Game PIN tidak valid atau game sudah dimulai");
  //       return;
  //     }

  //     // Check if nickname is already taken in this session
  //     const { data: existingParticipant } = await supabase
  //       .from("game_participants")
  //       .select("id")
  //       .eq("session_id", session.id)
  //       .eq("nickname", nickname.trim())
  //       .single();

  //     if (existingParticipant) {
  //       setError("Nickname sudah digunakan, pilih nickname lain");
  //       return;
  //     }

  //     // Join the game
  //     const { data: participant, error: participantError } = await supabase
  //       .from("game_participants")
  //       .insert({
  //         session_id: session.id,
  //         user_id: null, // Anonymous player
  //         nickname: nickname.trim(),
  //       })
  //       .select()
  //       .single();

  //     if (participantError) throw participantError;

  //     console.log("Participant created:", participant); // Debug log
  //     console.log("Session ID:", session.id); // Debug log

  //     // Redirect to game lobby
  //     router.push(`/play/${session.id}?participant=${participant.id}`);
  //   } catch (error: any) {
  //     console.error("Error joining game:", error);
  //     setError("Gagal bergabung ke game. Silakan coba lagi.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Slack className="w-5 h-5 text-cyan-950" />
            </div>
            <span className="text-2xl font-bold text-white">MyLessons</span>
          </Link>
          <Link
            href="/"
            className="text-white hover:bg-white hover:text-purple-600 transition-colors flex items-center gap-1 px-3 py-2 rounded-lg"
          >
            <ArrowBigLeft />
            Back
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-10 pb-16">
        <div className="max-w-md mx-auto">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                Gabung Game
              </CardTitle>
              <p className="text-gray-600">Masukkan Game PIN untuk bergabung</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={joinGame} className="space-y-6">
                <div>
                  <Label htmlFor="gamePin" className="text-base font-medium">
                    Game PIN
                  </Label>
                  <Input
                    id="gamePin"
                    type="text"
                    value={gamePin}
                    onChange={(e) =>
                      setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    className="mt-2 text-center text-2xl font-bold h-14 tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                {/* <div>
                  <Label htmlFor="nickname" className="text-base font-medium">
                    Nickname
                  </Label>
                  <Input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                    placeholder="Nama Anda"
                    className="mt-2 text-lg h-12"
                    maxLength={20}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maksimal 20 karakter
                  </p>
                </div> */}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
                  disabled={loading || !gamePin.trim()}
                >
                  {loading ? "Bergabung..." : "Gabung Game"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Belum punya Game PIN?{" "}
                  <Link
                    href="/dashboard"
                    className="text-purple-600 hover:underline"
                  >
                    Buat quiz sendiri
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        {/* <div className="max-w-xl mx-auto mt-12">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Cara Bermain
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-white/90">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <p className="text-sm">
                    Masukkan Game PIN yang diberikan host
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <p className="text-sm">
                    Pilih nickname unik untuk identitas Anda
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <p className="text-sm">
                    Tunggu host memulai game dan bersiaplah!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}
      </main>
    </div>
  );
}
