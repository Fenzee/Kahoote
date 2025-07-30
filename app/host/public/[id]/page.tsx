"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Play,
  Users,
  Clock,
  Star,
  Gamepad2,
  ArrowLeft,
  BookOpen,
  Trophy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

interface Quiz {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  difficulty_level: string;
  estimated_duration: number;
  play_count: number;
  rating_average: number;
  rating_count: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  creator_username: string;
  question_count: number;
}

export default function PublicQuizHostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [resolvedParams.id]);

  const loadQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from("public_quiz_browse")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Quiz tidak ditemukan");
        return;
      }

      setQuiz(data);
    } catch (error) {
      console.error("Error loading quiz:", error);
      setError("Gagal memuat quiz");
    } finally {
      setLoading(false);
    }
  };

  const startPublicQuiz = async () => {
    if (!quiz) return;

    setIsStarting(true);
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/auth/login");
        return;
      }

      // Generate unique PIN for practice session
      const gamePin = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create game session for public quiz (practice mode)
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          quiz_id: quiz.id,
          host_id: user.id,
          game_pin: gamePin,
          status: "active", // Start immediately for public quiz
          session_type: "public",
          is_practice_mode: true,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create participant record for the current user
      const nickname = user.user_metadata?.username || user.email?.split("@")[0] || "Player";
      
      const { data: participant, error: participantError } = await supabase
        .from("game_participants")
        .insert({
          session_id: session.id,
          user_id: user.id,
          nickname: nickname,
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Redirect to play-active page
      router.push(`/play-active/${session.id}?participant=${participant.id}`);
    } catch (error) {
      console.error("Error starting public quiz:", error);
      setError("Gagal memulai quiz");
      setIsStarting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "Mudah";
      case "medium":
        return "Sedang";
      case "hard":
        return "Sulit";
      default:
        return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Memuat quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error || "Quiz tidak ditemukan"}
            </h2>
            <Link href="/play-mode/browse">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Jelajahi Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/play-mode/browse" className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GolekQuiz
            </span>
          </Link>
          <div className="w-20"></div> {/* Spacer for balance */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden">
              {/* Quiz Cover Image */}
              {quiz.cover_image && (
                <div className="h-64 bg-gradient-to-r from-purple-500 to-blue-500 relative">
                  <img
                    src={quiz.cover_image}
                    alt={quiz.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute bottom-4 left-6">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-gray-800 mb-2"
                    >
                      {quiz.category_name}
                    </Badge>
                  </div>
                </div>
              )}

              <CardHeader className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
                      {quiz.title}
                    </CardTitle>
                    <p className="text-lg text-gray-600 mb-6">{quiz.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                      <span>Dibuat oleh {quiz.creator_username}</span>
                      <Badge
                        variant="secondary"
                        className={getDifficultyColor(quiz.difficulty_level)}
                      >
                        {getDifficultyText(quiz.difficulty_level)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quiz Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{quiz.question_count}</div>
                    <div className="text-sm text-gray-600">Pertanyaan</div>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{quiz.estimated_duration}</div>
                    <div className="text-sm text-gray-600">Menit</div>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{quiz.play_count}</div>
                    <div className="text-sm text-gray-600">Dimainkan</div>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Star className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {quiz.rating_average.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Rating ({quiz.rating_count})</div>
                  </div>
                </div>

                {/* Practice Mode Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Mode Latihan</h4>
                      <p className="text-sm text-blue-700">
                        Anda akan bermain dalam mode latihan mandiri. Tidak ada pemain lain dan 
                        Anda dapat mengerjakan quiz dengan tenang tanpa tekanan waktu.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={startPublicQuiz}
                  disabled={isStarting}
                  className="w-full py-4 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Memulai Quiz...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-3" />
                      Mulai Main Quiz
                    </>
                  )}
                </Button>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}