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
} from "lucide-react";

interface Answer {
  id: string;
  answer_text: string;
  color: string;
  order_index: number;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  points: number;
  order_index: number;
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
          answers (
            id,
            answer_text,
            color,
            order_index,
            is_correct
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
          router.push(
            `/results/${resolvedParams.id}?participant=${participantId}`
          );
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
          router.push(
            `/results/${resolvedParams.id}?participant=${participantId}`
          );
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

  // const submitQuiz = async () => {
  //   if (!gameState) return;

  //   const unansweredQuestions = gameState.questions.filter(
  //     (question) => !playerAnswers.has(question.id)
  //   );

  //   if (unansweredQuestions.length > 0) {
  //     const firstUnansweredIndex = gameState.questions.findIndex(
  //       (question) => !playerAnswers.has(question.id)
  //     );
  //     setCurrentQuestionIndex(firstUnansweredIndex);
  //     return;
  //   }

  //   try {
  //     await supabase
  //       .from("game_sessions")
  //       .update({
  //         status: "finished",
  //         ended_at: new Date().toISOString(),
  //        })
  //       .eq("id", gameState.sessionId);
  //   } catch (error) {
  //     console.error("Gagal mengakhiri sesi:", error);
  //   }

  //   router.push(`/results/${resolvedParams.id}?participant=${participantId}`);
  // };

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
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Memuat game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Game tidak ditemukan
            </h2>
            <Button onClick={() => router.push("/join")}>
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
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Slack className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-white">MyLessons</span>
          </div>
          <div className="flex items-center space-x-2">
            {gameState.totalTimeMinutes && gameState.status === "active" && (
              <Badge
                variant="secondary"
                className={`${
                  gameState.timeLeft <= 60
                    ? "bg-red-500 animate-pulse"
                    : gameState.timeLeft <= 300
                    ? "bg-yellow-500"
                    : "bg-green-500"
                } text-white text-lg px-4 py-2`}
              >
                <Timer className="w-4 h-4 mr-2" />
                {formatTime(gameState.timeLeft)}
              </Badge>
            )}

            <Badge
              variant="secondary"
              className={`${
                isConnected ? "bg-green-500" : "bg-red-500"
              } text-white`}
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
        <div className="flex w-full justify-center gap-4">
          {/* Soal */}
          {currentQuestion && (
            <Card className="bg-white/95 backdrop-blur-sm mb-6 w-[60%]">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentQuestion.question_text}
                </CardTitle>
                {currentAnswer && (
                  <div className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Sudah dijawab
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.answers.map((answer) => (
                    <Button
                      key={answer.id}
                      onClick={() => selectAnswer(answer.id)}
                      disabled={isSubmitting}
                      variant={
                        currentAnswer?.answer_id === answer.id
                          ? "default"
                          : "outline"
                      }
                      className={`p-6 h-auto text-left justify-start text-wrap ${
                        answer.color === "red"
                          ? "border-red-500 hover:bg-red-50"
                          : answer.color === "blue"
                          ? "border-blue-500 hover:bg-blue-50"
                          : answer.color === "yellow"
                          ? "border-yellow-500 hover:bg-yellow-50"
                          : "border-green-500 hover:bg-green-50"
                      } ${
                        currentAnswer?.answer_id === answer.id
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-full ${
                            answer.color === "red"
                              ? "bg-red-500"
                              : answer.color === "blue"
                              ? "bg-blue-500"
                              : answer.color === "yellow"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                        <span className="text-lg">{answer.answer_text}</span>
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
          <Card className="bg-white/95 backdrop-blur-sm mb-6 w-[30%]">
            <CardContent className="flex flex-col p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">Progress Quiz</span>
                <span className="text-sm text-gray-600">
                  Soal ke {currentQuestionIndex + 1} dari {totalQuestions}
                </span>
              </div>
              <Progress
                value={(answeredCount / totalQuestions) * 100}
                className="w-full h-3 mb-4"
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
                      playerAnswers.has(gameState.questions[index].id)
                        ? "bg-green-300 border-green-500 text-green-700"
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
          <Card className="flex justify-center items-center bg-white/95 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center p-2">
              <div className="flex justify-between items-center gap-2">
                <Button
                  onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>

                {answeredCount === totalQuestions ? (
                  <Button
                    onClick={submitQuiz}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    Selesai
                  </Button>
                ) : (
                  <span className="text-sm text-purple-600">
                    Dijawab: {answeredCount} dari {totalQuestions} pertanyaan
                  </span>
                )}

                <Button
                  onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  variant="outline"
                  size="sm"
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
