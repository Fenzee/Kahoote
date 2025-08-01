"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { ChatPanel } from "@/components/ui/chat-panel";

import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useAnimation,
} from "framer-motion";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GamePageWithLoading } from "@/components/ui/page-with-loading";

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
    avatar_url: string | null;
  };
}

interface GameSession {
  id: string;
  game_pin: string;
  status: string;
  total_time_minutes: number | null;
  countdown_started_at?: number | null;
  game_end_mode?: 'first_finish' | 'wait_timer'; // Game end setting
  allow_join_after_start?: boolean; // Allow players to join after game starts
  participants: Array<{
    id: string;
    nickname: string;
    joined_at: string;
    profiles?:
      | {
          avatar_url?: string | null;
        }
      | Array<{
          avatar_url?: string | null;
        }>;
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
    avatar_url: string | null;
  };
}

function HostGamePageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTimeSetup, setShowTimeSetup] = useState(false);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState<number>(10);
  const [gameEndMode, setGameEndMode] = useState<'first_finish' | 'wait_timer'>('wait_timer'); // Game end mode state
  const [allowJoinAfterStart, setAllowJoinAfterStart] = useState<boolean>(false); // Allow players to join after game starts
  const [isJoining, setIsJoining] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'players'>('settings');
  
  // Animation controls
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-15, 15]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-20, 20]),
    springConfig
  );
  
  // Card animations
  const cardAnimation = useAnimation();
  const settingsAnimation = useAnimation();
  const playersAnimation = useAnimation();
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
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const countdownDuration = 10; // 10 detik
  const [hostParticipantId, setHostParticipantId] = useState<string | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<{
    username: string;
    avatar_url: string | null;
  } | null>(null);


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
    if (user) {
      fetchUserProfile();
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

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
    }
  };

  const displayName = useMemo(() => {
    if (userProfile?.username) return userProfile.username;
    if (user && user.email) return user.email.split("@")[0];
    return "User";
  }, [userProfile, user]);

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
            username,
            avatar_url
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
        profiles: {
          username: quiz.profiles.username,
          avatar_url: quiz.profiles.avatar_url || null,
        },
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
          game_end_mode: gameEndMode, // Add game end mode to session creation
          allow_join_after_start: allowJoinAfterStart, // Add allow join after start setting
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
        game_end_mode: session.game_end_mode || gameEndMode, // Add game end mode to state
        allow_join_after_start: session.allow_join_after_start || allowJoinAfterStart, // Add allow join after start to state
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
      // setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!gameSession) return;

    try {
      console.log("Fetching participants for session:", gameSession.id);

      const { data, error } = await supabase
        .from("game_participants")
        .select(
          `
          id, 
          nickname,
          joined_at,
          profiles (
          avatar_url
          )
          `
        )
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

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    x.set(event.clientX - rect.left - halfWidth);
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
        game_end_mode: gameEndMode,
        allow_join_after_start: allowJoinAfterStart,
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
            router.push(
              `/play-active/${gameSession.id}?participant=${participantId}`
            );
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
      // Update status game menjadi finished
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "finished",
          ended_at: new Date().toISOString(),
        })
        .eq("id", gameSession.id);

      if (error) throw error;

      // Ambil data peserta terbaru
      const { data: latestParticipants, error: participantsError } =
        await supabase
          .from("game_participants")
          .select("id, nickname")
          .eq("session_id", gameSession.id);

      if (participantsError) {
        console.error("Error fetching latest participants:", participantsError);
      } else if (latestParticipants && latestParticipants.length > 0) {
        // Hitung skor untuk semua peserta
        console.log(
          `Calculating scores for ${latestParticipants.length} participants`
        );
        await Promise.all(
          latestParticipants.map(async (participant) => {
            try {
              await supabase.rpc("calculate_score", {
                session_id_input: gameSession.id,
                participant_id_input: participant.id,
              });
              console.log(`Score calculated for ${participant.nickname}`);
            } catch (err) {
              console.error(
                `Error calculating score for ${participant.nickname}:`,
                err
              );
            }
          })
        );
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
  //         <p>Menyiapkan game...</p>
  //       </div>
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
                className="flex-1 bg-transparent border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Coba Lagi
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz tidak ditemukan
          </h2>
          <Link href="/dashboard">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = quiz.creator_id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 text-gray-900 relative">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-center justify-between px-4 py-6 md:px-6 lg:px-8 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-3 font-bold text-xl"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Play className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            GolekQuiz
          </span>
        </motion.div>
        
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Button
            onClick={endSession}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back & end session
          </Button>
        </motion.div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-8"
        >
          {/* Left Column - Quiz Info & Settings */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quiz Info Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                  <CardHeader className="pb-4 px-0 pt-0 border-0">
                    <CardTitle className="text-2xl font-bold">
                      {quiz.title}
                    </CardTitle>
                    {quiz.description && (
                      <p className="text-purple-100 text-sm max-h-14 overflow-y-scroll">
                        {quiz.description}
                      </p>
                    )}
                  </CardHeader>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
                    >
                      <div className="text-3xl font-bold text-purple-600">
                        {quiz.questions.length}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Pertanyaan</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
                    >
                      <div className="text-3xl font-bold text-blue-600">
                        {gameSession.participants.length}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Pemain</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
                    >
                      <div className="text-3xl font-bold text-green-600">
                        {totalTimeMinutes}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Menit</div>
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-600 to-blue-600 border-2 border-white shadow-lg">
                        <AvatarImage
                          src={
                            quiz.profiles.avatar_url ||
                            (user?.email
                              ? `https://robohash.org/${encodeURIComponent(
                                  user.email
                                )}.png`
                              : "/default-avatar.png")
                          }
                          alt={user?.email || ""}
                          className="object-cover w-full h-full"
                        />
                        <AvatarFallback className="bg-white text-purple-600 font-bold">
                          {displayName?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-800">Maker {quiz.profiles.username}</div>
                        <div className="text-xs text-gray-500">Host</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          quiz.is_public
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-orange-100 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {quiz.is_public ? "Public" : "Private"}
                      </motion.div>

                      {isCreator && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200"
                        >
                          Quiz Anda
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Game Settings Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border-0 overflow-hidden">
                {/* Countdown sedang berlangsung */}
                {countdownLeft !== null && countdownLeft > 0 ? (
                  <CardContent className="p-12 text-center bg-gradient-to-br from-purple-50 to-blue-50">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-4"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-12 h-12 text-white" />
                      </div>
                      <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {countdownLeft}
                      </h2>
                      <p className="text-xl text-gray-600 font-medium">Mulai dalam {countdownLeft} detik...</p>
                      <p className="text-gray-500">Bersiaplah!</p>
                    </motion.div>
                  </CardContent>
                ) : (
                  <>
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                      <CardHeader className="pb-4 px-0 pt-0 border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Slack className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-bold">
                              Pengaturan Permainan
                            </CardTitle>
                            <p className="text-purple-100 text-sm">Konfigurasi game sesuai preferensi Anda</p>
                          </div>
                        </div>
                      </CardHeader>
                    </div>
                    <CardContent className="p-8 space-y-8">
                      {/* Time Settings */}
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="space-y-3"
                      >
                        <Label
                          htmlFor="totalTime"
                          className="block text-lg font-semibold text-gray-800"
                        >
                          ⏱️ Waktu Total Quiz
                        </Label>
                        <div className="relative">
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
                            className="w-full h-12 text-lg font-medium border-2 border-gray-200 focus:border-purple-500 rounded-xl transition-all duration-300"
                            placeholder="Masukkan waktu dalam menit"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                            menit
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Game End Mode Selection */}
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="space-y-4"
                      >
                        <Label className="block text-lg font-semibold text-gray-800">
                          🎯 Mode Akhir Permainan
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              gameEndMode === 'wait_timer' 
                                ? 'border-purple-500 bg-purple-50' 
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                            onClick={() => setGameEndMode('wait_timer')}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                id="wait_timer"
                                name="gameEndMode"
                                value="wait_timer"
                                checked={gameEndMode === 'wait_timer'}
                                onChange={(e) => setGameEndMode(e.target.value as 'first_finish' | 'wait_timer')}
                                className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                              />
                              <div>
                                <div className="font-semibold text-gray-800">⏰ Tunggu Timer</div>
                                <div className="text-sm text-gray-600">Semua pemain menunggu hingga waktu habis</div>
                              </div>
                            </div>
                          </motion.div>
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              gameEndMode === 'first_finish' 
                                ? 'border-purple-500 bg-purple-50' 
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                            onClick={() => setGameEndMode('first_finish')}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                id="first_finish"
                                name="gameEndMode"
                                value="first_finish"
                                checked={gameEndMode === 'first_finish'}
                                onChange={(e) => setGameEndMode(e.target.value as 'first_finish' | 'wait_timer')}
                                className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                              />
                              <div>
                                <div className="font-semibold text-gray-800">🏆 Pertama Selesai</div>
                                <div className="text-sm text-gray-600">Game berakhir ketika satu pemain selesai</div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Allow Join After Start Setting */}
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="space-y-4"
                      >
                        <Label className="block text-lg font-semibold text-gray-800">
                          👥 Izin Bergabung Setelah Game Dimulai
                        </Label>
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-pointer transition-all duration-300"
                          onClick={() => setAllowJoinAfterStart(!allowJoinAfterStart)}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="allowJoinAfterStart"
                              checked={allowJoinAfterStart}
                              onChange={(e) => setAllowJoinAfterStart(e.target.checked)}
                              className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800">Izinkan pemain bergabung setelah game dimulai</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Jika diaktifkan, pemain masih bisa bergabung menggunakan PIN meskipun permainan sudah berjalan
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>

                      {/* Action Buttons */}
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200"
                      >
                        <motion.div className="flex-1" whileHover={{ scale: 1.02 }}>
                          <Button
                            onClick={startCountdownBeforeGame}
                            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                            disabled={
                              gameSession.participants.length === 0 ||
                              !totalTimeMinutes ||
                              totalTimeMinutes < 1
                            }
                          >
                            <Play className="w-6 h-6 mr-3" />
                            Mulai Game
                          </Button>
                        </motion.div>
                        {gameSession?.status === "waiting" &&
                          !gameSession?.countdown_started_at && (
                            <motion.div className="flex-1" whileHover={{ scale: 1.02 }}>
                              <Button
                                onClick={joinAsHostAndStartCountdown}
                                disabled={isJoining}
                                className="w-full h-14 border-2 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 bg-transparent text-lg font-semibold rounded-xl transition-all duration-300"
                              >
                                {isJoining ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-3"></div>
                                    Memulai...
                                  </div>
                                ) : (
                                  <>
                                    <User className="w-6 h-6 mr-3" />
                                    Ikut Bermain sebagai Host
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          )}
                      </motion.div>
                    </CardContent>
                  </>
                )}
              </Card>
            </motion.div>
        </div>

          {/* Right Column - Game PIN & Players */}
          <div className="space-y-6">
            {/* Game PIN Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                  <CardHeader className="pb-4 px-0 pt-0 border-0">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <CardTitle className="text-2xl font-bold">
                          Game PIN
                        </CardTitle>
                        <p className="text-green-100 text-sm">Bagikan kepada pemain untuk bergabung</p>
                      </div>
                    </div>
                  </CardHeader>
                </div>
                <CardContent className="p-8 space-y-8">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="text-center space-y-4"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="text-7xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent tracking-wider"
                      >
                        {gameSession.game_pin}
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="relative"
                      >
                        <Button
                          onClick={copyGamePin}
                          onMouseEnter={() => setIsHovered(true)}
                          onMouseLeave={() => setIsHovered(false)}
                          onMouseMove={handleMouseMove}
                          variant="ghost"
                          size="icon"
                          className="w-12 h-12 text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300"
                        >
                          {copied ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <Copy className="w-6 h-6" />
                          )}
                        </Button>
                        <AnimatePresence mode="wait">
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                  type: "spring",
                                  stiffness: 260,
                                  damping: 15,
                                },
                              }}
                              exit={{ opacity: 0, y: 10, scale: 0.8 }}
                              style={{
                                translateX: translateX,
                                rotate: rotate,
                              }}
                              className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center justify-center rounded-xl bg-black/90 backdrop-blur-sm px-4 py-2 text-sm shadow-2xl min-w-[100px]"
                            >
                              <div className="text-white font-medium">
                                {copied ? "✅ Tersalin!" : "📋 Salin PIN"}
                              </div>
                              <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black/90 rotate-45"></div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="flex justify-center"
                  >
                    <div className="w-64 h-64 border-2 border-gray-200 rounded-2xl p-3 bg-white shadow-lg">
                      <QRCodeSVG
                        value={`${window.location.origin}/join?pin=${gameSession.game_pin}`}
                        size="100%"
                        className="w-full h-full"
                        bgColor="#FFFFFF"
                        fgColor="#4C1D95"
                        level="H"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="text-center"
                  >
                    <p className="text-gray-600 font-medium">
                      📱 Scan QR Code atau bagikan PIN kepada pemain
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Players Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                  <CardHeader className="pb-4 px-0 pt-0 border-0">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <CardTitle className="text-2xl font-bold">
                          Pemain ({gameSession.participants.length})
                        </CardTitle>
                        <p className="text-blue-100 text-sm">Daftar pemain yang telah bergabung</p>
                      </div>
                    </div>
                  </CardHeader>
                </div>
                <CardContent className="p-6">
                  {gameSession.participants.length === 0 ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="text-center py-12"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Menunggu pemain...
                      </h3>
                      <p className="text-gray-500">
                        Bagikan Game PIN untuk mengundang pemain bergabung
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="space-y-3 max-h-96 overflow-y-auto"
                    >
                      <div className="grid grid-cols-1 gap-3">
                        {gameSession.participants.map((participant, index) => (
                          <motion.div
                            key={participant.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                          >
                            <div className="flex items-center space-x-4">
                              <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 border-2 border-white shadow-lg">
                                <AvatarImage
                                  src={
                                    (participant.profiles &&
                                      (Array.isArray(participant.profiles)
                                        ? participant.profiles[0]?.avatar_url
                                        : participant.profiles?.avatar_url)) ||
                                    `https://robohash.org/${encodeURIComponent(
                                      participant.nickname
                                    )}.png`
                                  }
                                  alt={participant.nickname}
                                  className="object-cover w-full h-full"
                                />
                                <AvatarFallback className="bg-white text-purple-600 font-bold">
                                  {participant.nickname.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-gray-800">
                                  {participant.nickname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Bergabung {new Date(participant.joined_at).toLocaleTimeString(
                                    "id-ID",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-gray-500 font-medium">Online</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Chat Panel */}
      {user && gameSession && (
        <ChatPanel
          sessionId={gameSession.id}
          userId={user.id}
          nickname={displayName}
          avatarUrl={userProfile?.avatar_url}
          position="right"
          isHost={true}
        />
      )}
    </div>
  );
}

export default function HostGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <GamePageWithLoading 
      animation="slide"
      customLoadingMessage="Memuat ruang host..."
    >
      <HostGamePageContent params={params} />
    </GamePageWithLoading>
  );
}
