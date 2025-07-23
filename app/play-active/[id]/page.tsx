"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Slack,
  Wifi,
  WifiOff,
  Timer,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Gamepad2,
} from "lucide-react";

interface Answer {
  id: string;
  answer_text: string;
  color: string;
  order_index: number;
  is_correct: boolean;
  image_url?: string;
}

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  points: number;
  order_index: number;
  image_url?: string;
  answers: Answer[];
}

interface PlayerAnswer {
  question_id: string;
  answer_id: string;
  response_time: number;
}

interface GameState {
  sessionId: string;
  participantId: string;
  totalQuestions: number;
  status: string;
  questions: Question[];
  score: number;
  rank: number;
  totalPlayers: number;
  totalTimeMinutes: number | null;
  gameStartTime: Date | null;
  timeLeft: number;
}

export default function PlayActiveGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const participantId = searchParams.get("participant");

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState<Map<string, PlayerAnswer>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use refs to prevent infinite loops
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  // Initial load - only once
  useEffect(() => {
    if (!participantId) {
      router.push("/join");
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      loadGameData();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadGameData = async () => {
    try {
      // Get game session
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, quiz_id, total_time_minutes, started_at")
        .eq("id", resolvedParams.id)
        .single();

      if (sessionError) throw sessionError;

      if (session.status === "finished") {
        router.push(
          `/results/${resolvedParams.id}?participant=${participantId}`
        );
        return;
      }

      if (session.status === "waiting") {
        router.push(`/play/${resolvedParams.id}?participant=${participantId}`);
        return;
      }

      // Get questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(
          `
          id,
          question_text,
          time_limit,
          points,
          order_index,
          image_url,
          answers (
            id,
            answer_text,
            color,
            order_index,
            is_correct,
            image_url
          )
        `
        )
        .eq("quiz_id", session.quiz_id)
        .order("order_index");

      if (questionsError) throw questionsError;

      // Get participant data
      const { data: participant, error: participantError } = await supabase
        .from("game_participants")
        .select("score")
        .eq("id", participantId)
        .single();

      if (participantError) throw participantError;

      // Get all participants for ranking
      const { data: allParticipants, error: allParticipantsError } =
        await supabase
          .from("game_participants")
          .select("id, score")
          .eq("session_id", resolvedParams.id)
          .order("score", { ascending: false });

      if (allParticipantsError) throw allParticipantsError;

      // Get existing answers
      const { data: existingAnswers, error: answersError } = await supabase
        .from("game_responses")
        .select("question_id, answer_id, response_time")
        .eq("session_id", resolvedParams.id)
        .eq("participant_id", participantId);

      if (answersError) throw answersError;

      // Build answers map
      const answersMap = new Map<string, PlayerAnswer>();
      existingAnswers?.forEach((answer) => {
        answersMap.set(answer.question_id, {
          question_id: answer.question_id,
          answer_id: answer.answer_id,
          response_time: answer.response_time,
        });
      });

      const rank = allParticipants.findIndex((p) => p.id === participantId) + 1;
      const gameStartTime = session.started_at
        ? new Date(session.started_at)
        : null;
      let timeLeft = 0;

      if (session.total_time_minutes && gameStartTime) {
        const now = new Date();
        const totalTimeMs = session.total_time_minutes * 60 * 1000;
        const endTime = new Date(gameStartTime.getTime() + totalTimeMs);
        const remaining = Math.max(0, endTime.getTime() - now.getTime());
        timeLeft = Math.ceil(remaining / 1000);
      }

      const newGameState: GameState = {
        sessionId: session.id,
        participantId: participantId!,
        totalQuestions: questions.length,
        status: session.status,
        questions: questions.map((q) => ({
          ...q,
          answers: q.answers.sort((a, b) => a.order_index - b.order_index),
        })),
        score: participant.score,
        rank: rank,
        totalPlayers: allParticipants.length,
        totalTimeMinutes: session.total_time_minutes,
        gameStartTime: gameStartTime,
        timeLeft: timeLeft,
      };

      setGameState(newGameState);
      setPlayerAnswers(answersMap);

      // Start timers after state is set
      startTimers(newGameState);
    } catch (error) {
      console.error("Error loading game data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTimers = (gameData: GameState) => {
    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    // Start game timer if needed
    if (
      gameData.totalTimeMinutes &&
      gameData.gameStartTime &&
      gameData.status === "active"
    ) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const totalTimeMs = gameData.totalTimeMinutes! * 60 * 1000;
        const endTime = new Date(
          gameData.gameStartTime!.getTime() + totalTimeMs
        );
        const remaining = Math.max(0, endTime.getTime() - now.getTime());
        const timeLeftSeconds = Math.ceil(remaining / 1000);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);

          // Hitung skor sebelum redirect
          (async () => {
            try {
              // Hitung skor
              await supabase.rpc("calculate_score", {
                session_id_input: gameData.sessionId,
                participant_id_input: gameData.participantId,
              });
              console.log("Score calculated when time is up");
            } catch (error) {
              console.error("Error calculating score when time is up:", error);
            } finally {
              // Redirect ke halaman hasil
              router.push(
                `/results/${resolvedParams.id}?participant=${participantId}`
              );
            }
          })();
          return;
        }

        setGameState((prev) =>
          prev ? { ...prev, timeLeft: timeLeftSeconds } : null
        );
      }, 1000);
    }

    // Start polling for game status
    pollRef.current = setInterval(async () => {
      try {
        const { data: session, error } = await supabase
          .from("game_sessions")
          .select("status")
          .eq("id", resolvedParams.id)
          .single();

        if (!error && session.status === "finished") {
          // Hitung skor sebelum redirect
          try {
            await supabase.rpc("calculate_score", {
              session_id_input: gameData.sessionId,
              participant_id_input: gameData.participantId,
            });
            console.log("Score calculated when game is finished by host");
          } catch (err) {
            console.error(
              "Error calculating score when game is finished:",
              err
            );
          } finally {
            router.push(
              `/results/${resolvedParams.id}?participant=${participantId}`
            );
          }
        }
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    }, 3000);
  };

  const selectAnswer = async (answerId: string) => {
    if (!gameState || isSubmitting) return;

    const currentQuestion = gameState.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);

    try {
      // Delete existing answer
      await supabase
        .from("game_responses")
        .delete()
        .eq("session_id", gameState.sessionId)
        .eq("participant_id", gameState.participantId)
        .eq("question_id", currentQuestion.id);

      // Insert new answer
      const { error } = await supabase.from("game_responses").insert({
        session_id: gameState.sessionId,
        participant_id: gameState.participantId,
        question_id: currentQuestion.id,
        answer_id: answerId,
        response_time: 1000,
      });

      if (error) throw error;

      // Update local state
      const newAnswer: PlayerAnswer = {
        question_id: currentQuestion.id,
        answer_id: answerId,
        response_time: 1000,
      };

      setPlayerAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentQuestion.id, newAnswer);
        return newMap;
      });
    } catch (error) {
      console.error("Error saving answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (!gameState || index < 0 || index >= gameState.totalQuestions) return;
    setCurrentQuestionIndex(index);
  };

  const submitQuiz = async () => {
    if (!gameState) return;

    // Pastikan semua pertanyaan dijawab
    const unansweredQuestions = gameState.questions.filter(
      (question) => !playerAnswers.has(question.id)
    );
    if (unansweredQuestions.length > 0) {
      const firstUnansweredIndex = gameState.questions.findIndex(
        (question) => !playerAnswers.has(question.id)
      );
      setCurrentQuestionIndex(firstUnansweredIndex);
      return;
    }

    try {
      // Tandai sesi selesai
      await supabase
        .from("game_sessions")
        .update({ status: "finished", ended_at: new Date().toISOString() })
        .eq("id", gameState.sessionId);

      // Hitung skor peserta
      const { data, error } = await supabase.rpc("calculate_score", {
        session_id_input: gameState.sessionId,
        participant_id_input: gameState.participantId,
      });

      if (error) console.error("Error kalkulasi skor:", error);
    } catch (error) {
      console.error("Gagal submit kuis:", error);
    }

    router.push(`/results/${resolvedParams.id}?participant=${participantId}`);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center text-blue-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Memuat game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Game tidak ditemukan
            </h2>
            <Button
              onClick={() => router.push("/join")}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              Kembali ke Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = gameState.questions[currentQuestionIndex];
  const currentAnswer = playerAnswers.get(currentQuestion?.id || "");
  const answeredCount = playerAnswers.size;
  const totalQuestions = gameState.totalQuestions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GolekQuiz
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {gameState.totalTimeMinutes && gameState.status === "active" && (
              <Badge
                variant="outline"
                className={`${
                  gameState.timeLeft <= 60
                    ? "bg-red-100 text-red-800 border-red-300"
                    : gameState.timeLeft <= 300
                    ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                    : "bg-green-100 text-green-800 border-green-300"
                } text-lg px-4 py-2`}
              >
                <Timer className="w-4 h-4 mr-2" />
                {formatTime(gameState.timeLeft)}
              </Badge>
            )}

            <Badge
              variant="outline"
              className={`${
                isConnected
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-red-100 text-red-800 border-red-300"
              }`}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex w-full justify-center gap-4 flex-col md:flex-row">
          {/* Soal */}
          {currentQuestion && (
            <Card className="bg-white/90 backdrop-blur-sm mb-6 w-full md:w-[60%] shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-gray-900">
                  {currentQuestion.question_text}
                </CardTitle>
                {currentQuestion.image_url && (
                  <div className="flex justify-center mt-4">
                    <img
                      src={currentQuestion.image_url}
                      alt="Gambar Soal"
                      className="max-h-64 rounded-xl shadow-md"
                    />
                  </div>
                )}

                {currentAnswer && (
                  <div className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 border-green-300"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Sudah dijawab
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.answers.map((answer, index) => (
                    <Button
                      key={answer.id}
                      onClick={() => selectAnswer(answer.id)}
                      disabled={isSubmitting}
                      variant={
                        currentAnswer?.answer_id === answer.id
                          ? "default"
                          : "outline"
                      }
                      className={`p-6 h-auto text-left justify-start text-wrap border-2 ${
                        answer.color === "red"
                          ? "border-red-300 hover:bg-red-50"
                          : answer.color === "blue"
                          ? "border-blue-300 hover:bg-blue-50"
                          : answer.color === "yellow"
                          ? "border-yellow-300 hover:bg-yellow-50"
                          : "border-green-300 hover:bg-green-50"
                      } ${
                        currentAnswer?.answer_id === answer.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-full ${
                            currentAnswer?.answer_id === answer.id
                              ? "bg-white text-purple-600"
                              : "bg-blue-100 text-blue-600"
                          } flex items-center justify-center font-medium`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div className="flex flex-col w-[80%] max-h-40 overflow-y-auto pr-2">
                          <div className="text-lg">{answer.answer_text}</div>
                          {answer.image_url && (
                            <img
                              src={answer.image_url}
                              alt="Gambar Jawaban"
                              className="w-full max-h-48 object-contain rounded-xl border border-gray-200 mt-2"
                            />
                          )}
                        </div>
                        {currentAnswer?.answer_id === answer.id && (
                          <CheckCircle className="w-5 h-5 ml-auto" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navbar soal */}
          <Card className="bg-white/90 backdrop-blur-sm mb-6 w-full md:w-[30%] shadow-xl border-0">
            <CardContent className="flex flex-col p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Progress Quiz
                </span>
                <span className="text-sm text-gray-600">
                  Soal ke {currentQuestionIndex + 1} dari {totalQuestions}
                </span>
              </div>
              <Progress
                value={(answeredCount / totalQuestions) * 100}
                className="w-full h-3 mb-4 bg-gray-200"
              />

              <div className="flex justify-center flex-wrap gap-2 mb-4">
                {gameState.questions.map((_, index) => (
                  <Button
                    key={index}
                    onClick={() => navigateToQuestion(index)}
                    variant={
                      index === currentQuestionIndex ? "default" : "outline"
                    }
                    size="sm"
                    className={`w-10 h-10 p-0 rounded-full ${
                      index === currentQuestionIndex
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                        : ""
                    } ${
                      playerAnswers.has(gameState.questions[index].id)
                        ? "bg-green-100 border-green-300 text-green-700"
                        : ""
                    }`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex w-full justify-center items-center">
          <Card className="flex justify-center items-center bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="flex items-center justify-center p-4">
              <div className="flex justify-between items-center gap-4">
                <Button
                  onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="border-2 border-gray-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>

                {answeredCount === totalQuestions ? (
                  <Button
                    onClick={submitQuiz}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6"
                  >
                    Selesai
                  </Button>
                ) : (
                  <span className="text-sm text-purple-600 font-medium">
                    Dijawab: {answeredCount} dari {totalQuestions} pertanyaan
                  </span>
                )}

                <Button
                  onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  variant="outline"
                  className="border-2 border-gray-200"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
