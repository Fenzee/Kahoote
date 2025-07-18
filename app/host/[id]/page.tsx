"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

import {
  ArrowLeft,
  Play,
  Users,
  Copy,
  Check,
  Slack,
  AlertCircle,
  User,
  Globe,
  Lock,
  Clock,
  ArrowBigLeft,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  creator_id: string;
  questions: Array<{
    id: string;
    question_text: string;
    time_limit: number;
    points: number;
  }>;
  profiles: {
    username: string;
  };
}

interface GameSession {
  id: string;
  game_pin: string;
  status: string;
  total_time_minutes: number | null;
  countdown_started_at?: number | null;
  participants: Array<{
    id: string;
    nickname: string;
    joined_at: string;
  }>;
}

interface SupabaseQuizResponse {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  creator_id: string;
  questions: Array<{
    id: string;
    question_text: string;
    time_limit: number;
    points: number;
  }>;
  profiles: {
    username: string;
  };
}

export default function HostGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTimeSetup, setShowTimeSetup] = useState(false);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number>(10);
  const [isJoining, setIsJoining] = useState(false);

  // const [isJoining, setIsJoining] = useState<number>(10);
  const [error, setError] = useState<{
    type:
      | "permission"
      | "not_found"
      | "no_questions"
      | "connection"
      | "unknown";
    message: string;
    details?: string;
  } | null>(null);

  const hasCreatedSession = useRef(false);
  // const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const countdownDuration = 10; // 10 detik
  const [hostParticipantId, setHostParticipantId] = useState<string | null>(
    null
  );
  // const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  // const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (user && !gameSession && !hasCreatedSession.current) {
      hasCreatedSession.current = true;
      fetchQuizAndCreateSession();
    }
  }, [user, gameSession]);

  useEffect(() => {
    if (!user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (gameSession) {
      fetchParticipants();

      const channel = supabase
        .channel(`game_${gameSession.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_participants",
            filter: `session_id=eq.${gameSession.id}`,
          },
          (payload) => {
            console.log("Participant change detected:", payload);
            fetchParticipants();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [gameSession]);

  useEffect(() => {
    if (gameSession?.countdown_started_at && gameSession.status === "active") {
      const interval = setInterval(() => {
        const now = new Date();
        const countdownStart = new Date(gameSession.countdown_started_at!);
        const remaining = Math.max(
          0,
          5 - Math.floor((now.getTime() - countdownStart.getTime()) / 1000)
        );

        setCountdownLeft(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          setCountdownLeft(null);
          router.push(`/game/${gameSession.id}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameSession, router]);

  useEffect(() => {
    if (
      gameSession?.countdown_started_at &&
      hostParticipantId &&
      gameSession.status === "waiting"
    ) {
      const startTime = new Date(gameSession.countdown_started_at).getTime();
      const now = Date.now();
      const diff = Math.ceil((startTime + 5000 - now) / 1000); // 5 detik countdown

      if (diff <= 0) {
        router.push(
          `/play-active/${resolvedParams.id}?participant=${hostParticipantId}`
        );
      } else {
        setCountdownLeft(diff);
        const interval = setInterval(() => {
          setCountdownLeft((prev) => {
            if (prev && prev > 1) return prev - 1;

            clearInterval(interval);
            router.push(
              `/play-active/${resolvedParams.id}?participant=${hostParticipantId}`
            );
            return 0;
          });
        }, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [gameSession?.countdown_started_at, hostParticipantId]);

  const fetchQuizAndCreateSession = async () => {
    try {
      console.log("🔍 Fetching quiz with ID:", resolvedParams.id);
      console.log("👤 Current user:", user?.id);

      if (gameSession) {
        console.log("⛔ Game session sudah ada, tidak membuat ulang.");
        return;
      }
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!resolvedParams.id) {
        throw new Error("Quiz ID is required");
      }

      const { data: testData, error: testError } = await supabase
        .from("quizzes")
        .select("id")
        .limit(1);

      if (testError) {
        console.error("❌ Supabase connection test failed:", testError);
        setError({
          type: "connection",
          message: "Tidak dapat terhubung ke database",
          details: testError.message,
        });
        return;
      }

      console.log("✅ Supabase connection test passed");

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          is_public,
          creator_id,
          questions (
            id,
            question_text,
            time_limit,
            points
          ),
          profiles!quizzes_creator_id_fkey (
            username
          )
        `
        )
        .eq("id", resolvedParams.id)
        .single();

      console.log("📊 Quiz query result:", { quizData, quizError });

      if (quizError) {
        console.error("❌ Quiz fetch error:", quizError);
        if (quizError.code === "PGRST116") {
          setError({
            type: "not_found",
            message: "Quiz tidak ditemukan",
            details: "Quiz dengan ID tersebut tidak ada dalam database",
          });
        } else {
          setError({
            type: "unknown",
            message: "Gagal memuat quiz",
            details: quizError.message,
          });
        }
        return;
      }

      if (!quizData) {
        setError({
          type: "not_found",
          message: "Quiz tidak ditemukan",
          details: "Data quiz tidak tersedia",
        });
        return;
      }

      const quiz = quizData as unknown as SupabaseQuizResponse;

      console.log("🎯 Quiz details:", {
        id: quiz.id,
        title: quiz.title,
        creator_id: quiz.creator_id,
        is_public: quiz.is_public,
        current_user: user.id,
        is_creator: quiz.creator_id === user.id,
      });

      const isCreator = quiz.creator_id === user.id;
      const isPublic = quiz.is_public;

      if (!isCreator && !isPublic) {
        console.log("❌ Permission denied: Private quiz, not creator");
        setError({
          type: "permission",
          message: "Tidak dapat menghost quiz ini",
          details:
            "Quiz ini bersifat private dan hanya dapat dihost oleh pembuatnya",
        });
        return;
      }

      if (!quiz.questions || quiz.questions.length === 0) {
        setError({
          type: "no_questions",
          message: "Quiz tidak memiliki pertanyaan",
          details: "Tambahkan pertanyaan terlebih dahulu sebelum menghost quiz",
        });
        return;
      }

      console.log("✅ Permission check passed - User can host this quiz");

      const processedQuiz: Quiz = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        is_public: quiz.is_public,
        creator_id: quiz.creator_id,
        questions: quiz.questions,
        profiles: quiz.profiles,
      };

      setQuiz(processedQuiz);

      console.log("🎮 Creating game session...");
      const gamePin = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: session, error: createSessionError } = await supabase
        .from("game_sessions")
        .insert({
          quiz_id: resolvedParams.id,
          host_id: user.id,
          game_pin: gamePin,
          status: "waiting",
          total_time_minutes: null,
        })
        .select()
        .single();

      if (createSessionError) {
        console.error("❌ Session creation error:", createSessionError);
        throw createSessionError;
      }

      console.log("✅ Game session created:", session);

      setGameSession({
        id: session.id,
        game_pin: session.game_pin,
        status: session.status,
        total_time_minutes: session.total_time_minutes,
        participants: [],
      });
    } catch (error) {
      console.error("💥 Error in fetchQuizAndCreateSession:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (!error || typeof error !== "object") {
        setError({
          type: "unknown",
          message: "Terjadi kesalahan tidak dikenal",
          details: errorMessage,
        });
      } else if (errorMessage.includes("not authenticated")) {
        setError({
          type: "permission",
          message: "Sesi login telah berakhir",
          details: "Silakan login ulang untuk melanjutkan",
        });
      } else if (errorMessage.includes("connection")) {
        setError({
          type: "connection",
          message: "Masalah koneksi database",
          details: "Periksa koneksi internet dan coba lagi",
        });
      } else {
        setError({
          type: "unknown",
          message: "Gagal menyiapkan game",
          details: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!gameSession) return;

    try {
      console.log("Fetching participants for session:", gameSession.id);

      const { data, error } = await supabase
        .from("game_participants")
        .select("id, nickname, joined_at")
        .eq("session_id", gameSession.id)
        .order("joined_at", { ascending: true });

      if (error) {
        console.error("Error fetching participants:", error);
        throw error;
      }

      console.log("Fetched participants:", data);

      setGameSession((prev) =>
        prev
          ? {
              ...prev,
              participants: data || [],
            }
          : null
      );
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const copyGamePin = async () => {
    if (!gameSession) return;

    try {
      await navigator.clipboard.writeText(gameSession.game_pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleStartGame = () => {
    if (!gameSession || gameSession.participants.length === 0) return;
    setShowTimeSetup(true);
  };

  const startCountdownBeforeGame = async () => {
    if (!gameSession || !totalTimeMinutes) return;

    const countdownStartTime = new Date(); // Waktu countdown dimulai
    const startedTime = new Date(
      countdownStartTime.getTime() + countdownDuration * 1000
    );

    // 1. Simpan ke Supabase terlebih dahulu
    const { error } = await supabase
      .from("game_sessions")
      .update({
        countdown_started_at: countdownStartTime.toISOString(),
        started_at: startedTime.toISOString(),
        status: "active",
        total_time_minutes: totalTimeMinutes,
      })
      .eq("id", gameSession.id);

    if (error) {
      console.error("Gagal menyimpan waktu countdown:", error);
      return;
    }

    // 2. Jalankan countdown lokal di host untuk ditampilkan
    setCountdownLeft(countdownDuration);
    let secondsLeft = countdownDuration;

    const interval = setInterval(() => {
      secondsLeft -= 1;
      setCountdownLeft(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);

        // 3. Setelah countdown selesai, redirect ke halaman pengerjaan
        router.push(`/game/${gameSession.id}`);
      }
    }, 1000);
  };

  const joinAsHostAndStartCountdown = async () => {
  if (!gameSession) return;

  setIsJoining(true);
  setError(null);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user) {
      setError({
        type: "unknown",
        message: "Gagal memuat quiz",
        details: "tidak ada user yang terautentikasi",
      });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setError({
        type: "unknown",
        message: "Gagal memuat quiz",
        details: "tidak ada profil yang ditemukan",
      });
      return;
    }

    // Insert participant jika belum
    const { data: existing } = await supabase
      .from("game_participants")
      .select("id")
      .eq("session_id", gameSession.id)
      .eq("nickname", profile.username)
      .maybeSingle();

    let participantId = existing?.id;

    if (!participantId) {
      const { data: newParticipant } = await supabase
        .from("game_participants")
        .insert({
          session_id: gameSession.id,
          user_id: user.id,
          nickname: profile.username,
        })
        .select()
        .single();

      participantId = newParticipant.id;
    }

    // === START COUNTDOWN ===
    const countdownDuration = 10;
    const now = new Date();
    const startedTime = new Date(now.getTime() + countdownDuration * 1000);

    const { error: updateError } = await supabase
      .from("game_sessions")
      .update({
        countdown_started_at: now.toISOString(),
        started_at: startedTime.toISOString(),
        status: "active",
        total_time_minutes: totalTimeMinutes,
      })
      .eq("id", gameSession.id);

    if (updateError) {
      setError({
        type: "unknown",
        message: "Gagal memulai countdown",
        details: "Gagal menyimpan waktu mulai",
      });
      return;
    }

    setHostParticipantId(participantId);
    setCountdownLeft(countdownDuration); // untuk ditampilkan di UI

    let secondsLeft = countdownDuration;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      setCountdownLeft(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        router.push(`/play-active/${gameSession.id}?participant=${participantId}`);
      }
    }, 1000);
  } catch (err) {
    console.error(err);
    setError({
      type: "unknown",
      message: "Gagal memuat quiz",
      details: "Terjadi kesalahan saat bergabung sebagai host",
    });
  } finally {
    setIsJoining(false);
  }
};


  const endSession = async () => {
    if (!gameSession) return;

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "finished",
          ended_at: new Date().toISOString(),
        })
        .eq("id", gameSession.id);

      if (error) throw error;

      router.push("/dashboard");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Menyiapkan game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error.message}
            </h2>
            <p className="text-gray-600 mb-4 text-sm">{error.details}</p>
          </div>

          <div className="space-y-3">
            {error.type === "permission" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-800 mb-2">Solusi:</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>
                    • Minta pembuat quiz untuk mengubah status menjadi public
                  </li>
                  <li>• Atau login dengan akun pembuat quiz</li>
                  <li>• Hubungi pembuat quiz untuk mendapatkan akses</li>
                </ul>
              </div>
            )}

            {error.type === "not_found" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Kemungkinan penyebab:
                </h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Quiz telah dihapus</li>
                  <li>• Link yang digunakan tidak valid</li>
                  <li>• Quiz belum dipublikasikan</li>
                </ul>
              </div>
            )}

            {error.type === "no_questions" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-orange-800 mb-2">
                  Yang perlu dilakukan:
                </h3>
                <ul className="text-orange-700 text-sm space-y-1">
                  <li>• Buka halaman edit quiz</li>
                  <li>• Tambahkan minimal 1 pertanyaan</li>
                  <li>• Simpan perubahan</li>
                  <li>• Coba host ulang</li>
                </ul>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={fetchQuizAndCreateSession}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                Coba Lagi
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex-1"
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </div>

          {error.type === "connection" && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-left">
              <p className="font-semibold text-red-800">Tips Debugging:</p>
              <ul className="text-red-700 mt-1 space-y-1">
                <li>• Periksa koneksi internet</li>
                <li>• Refresh halaman</li>
                <li>• Coba beberapa saat lagi</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!quiz || !gameSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz tidak ditemukan
          </h2>
          <Link href="/dashboard">
            <Button>Kembali ke Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = quiz.creator_id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-row-reverse justify-between items-center space-x-4">
            <Link href="/dashboard">
              <Button
                onClick={endSession}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
              >
                <ArrowBigLeft className="w-4 h-4 mr-1" />
                Back & end session
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Slack className="w-5 h-5 text-cyan-950" />
              </div>
              <span className="text-2xl font-bold text-white">MyLessons</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        <div className="flex flex-col gap-4">
          {/* Game Info */}
          <div className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:grid-rows-2 md:gap-4">
            <Card className="bg-white/95 backdrop-blur-sm md:col-start-1 md:row-start-1 md:col-end-2 md:row-end-2">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-1 justify-between">
                    <div>
                      <CardTitle className="text-2xl text-gray-900 mb-2">
                        {quiz.title}
                      </CardTitle>
                      {quiz.description && (
                        <p className="text-gray-600 mb-3">{quiz.description}</p>
                      )}
                    </div>

                    {/* Quiz Status and Creator Info */}
                    <div className="flex flex-col items-center justify-center text-sm gap-1">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <User className="w-3 h-3" />
                        <span>Maker {quiz.profiles.username}</span>
                      </div>
                      <div className="flex flex-col items-center md:flex-row gap-1">
                        <div
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                            quiz.is_public
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {quiz.is_public ? (
                            <Globe className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          <span>{quiz.is_public ? "Public" : "Private"}</span>
                        </div>

                        {isCreator && (
                          <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            Quiz Anda
                          </div>
                        )}

                        {!isCreator && quiz.is_public && (
                          <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Hosting Public Quizz
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {quiz.questions.length}
                    </div>
                    <div className="text-sm text-gray-600">Pertanyaan</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {gameSession.participants.length}
                    </div>
                    <div className="text-sm text-gray-600">Pemain</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game PIN */}
            <Card className="bg-white/95 backdrop-blur-sm md:col-start-2 md:row-start-1 md:col-end-3 md:row-end-3">
              <CardHeader>
                <CardTitle className="text-center">Game PIN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center flex flex-col gap-2">
                  <div className="text-6xl font-bold text-purple-600 tracking-wider">
                    {gameSession.game_pin}
                  </div>
                  <div>
                    <Button
                      onClick={copyGamePin}
                      variant="outline"
                      className="bg-transparent"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Salin PIN
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex justify-center border-2 rounded-xl p-2">
                      <QRCodeSVG
                        value={`${window.location.origin}/join?pin=${gameSession.game_pin}`} // Ganti dengan URL join yang benar
                        size={256}
                        bgColor="#FFFFFF"
                        fgColor="#4C1D95" // warna ungu tua
                        level="H"
                        // includeMargin
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Bagikan PIN atau scan QRCode kepada pemain untuk bergabung
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Setup Modal */}
            <Card className="mt-0 bg-white/95 backdrop-blur-sm border-2 border-purple-300 md:col-start-1 md:row-start-2 md:col-end-2 md:row-end-3">
              {/* Countdown sedang berlangsung */}
              {countdownLeft !== null && countdownLeft > 0 ? (
                <CardContent className="p-8 text-center">
                  <h2 className="text-4xl font-bold text-purple-700 mb-2">
                    Mulai dalam {countdownLeft} detik...
                  </h2>
                  <p className="text-gray-600">Bersiaplah!</p>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-700">
                      <Clock className="w-5 h-5 mr-2" />
                      Set Quiz Time Limit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    {/* Form input waktu dan tombol mulai game */}
                    <div className="flex-1 space-y-3">
                      <Label
                        htmlFor="totalTime"
                        className="text-sm font-medium text-gray-700"
                      >
                        Total Quiz Time (minutes)
                      </Label>
                      <Input
                        id="totalTime"
                        type="number"
                        min="1"
                        max="120"
                        value={totalTimeMinutes}
                        onChange={(e) =>
                          setTotalTimeMinutes(
                            Number.parseInt(e.target.value) || 1
                          )
                        }
                        className="mt-1"
                        placeholder="Masukkan waktu dalam menit"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center justify-center space-x-2">
                        <Button
                          onClick={startCountdownBeforeGame}
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={
                            gameSession.participants.length === 0 ||
                            !totalTimeMinutes ||
                            totalTimeMinutes < 1
                          }
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Mulai Game ({totalTimeMinutes} menit)
                        </Button>
                      </div>
                      <div className="flex flex-1 items-center justify-center space-x-2">
                        {gameSession?.status === "waiting" &&
                          !gameSession?.countdown_started_at && (
                            <Button
                              onClick={joinAsHostAndStartCountdown}
                              disabled={isJoining}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {isJoining
                                ? "Memulai..."
                                : "Ikut Bermain sebagai Host"}
                            </Button>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>

          {/* Participants */}
          <div>
            <Card className="bg-white/95 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Pemain ({gameSession.participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameSession.participants.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Menunggu pemain...
                    </h3>
                    <p className="text-gray-600">
                      Bagikan Game PIN untuk mengundang pemain bergabung
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {gameSession.participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {index + 1}
                          </div>
                          <span className="font-medium">
                            {participant.nickname}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(participant.joined_at).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
