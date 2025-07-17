"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { Clock, Trophy, Slack, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

interface Answer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  color: string;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  points: number;
  order_index: number;
  answers: Answer[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

interface SoloGameState {
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  timeLeft: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  gamePhase: "question" | "answered" | "finished";
}

export default function SoloPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameState, setGameState] = useState<SoloGameState>({
    currentQuestionIndex: 0,
    score: 0,
    correctAnswers: 0,
    timeLeft: 0,
    hasAnswered: false,
    selectedAnswer: null,
    gamePhase: "question",
  });

  useEffect(() => {
    fetchQuiz();
  }, [resolvedParams.id]);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    // Only start timer if we're in question phase, have time left, and quiz is loaded
    if (gameState.gamePhase === "question" && gameState.timeLeft > 0 && quiz) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (
      gameState.gamePhase === "question" &&
      gameState.timeLeft === 0 &&
      quiz
    ) {
      // Time's up - auto advance with no answer
      handleTimeUp();
    }
  }, [gameState.timeLeft, gameState.gamePhase, quiz]); // Add quiz as dependency

  // Fix the timer initialization in fetchQuiz function
  const fetchQuiz = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          questions (
            id,
            question_text,
            time_limit,
            points,
            order_index,
            answers (
              id,
              answer_text,
              is_correct,
              color,
              order_index
            )
          )
        `
        )
        .eq("id", resolvedParams.id)
        .eq("is_public", true)
        .single();

      if (quizError) throw quizError;

      const questions: Question[] = quizData.questions
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          time_limit: q.time_limit,
          points: q.points,
          order_index: q.order_index,
          answers: q.answers.sort(
            (a: any, b: any) => a.order_index - b.order_index
          ),
        }));

      setQuiz({
        id: quizData.id,
        title: quizData.title,
        description: quizData.description,
        questions,
      });

      // Start first question with proper timer
      if (questions.length > 0) {
        setGameState((prev) => ({
          ...prev,
          timeLeft: questions[0].time_limit,
          gamePhase: "question", // Make sure we're in question phase
        }));
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = (answerId: string) => {
    if (!quiz || gameState.hasAnswered) return;

    const currentQuestion = quiz.questions[gameState.currentQuestionIndex];
    const selectedAnswer = currentQuestion.answers.find(
      (a) => a.id === answerId
    );
    const responseTime =
      (currentQuestion.time_limit - gameState.timeLeft) * 1000;

    let pointsEarned = 0;
    let isCorrect = false;

    if (selectedAnswer?.is_correct) {
      isCorrect = true;
      // Calculate points based on response time
      const timeBonus =
        1 - (responseTime / (currentQuestion.time_limit * 1000)) * 0.5;
      pointsEarned = Math.max(
        Math.floor(currentQuestion.points * 0.5),
        Math.floor(currentQuestion.points * timeBonus)
      );
    }

    setGameState((prev) => ({
      ...prev,
      hasAnswered: true,
      selectedAnswer: answerId,
      score: prev.score + pointsEarned,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      gamePhase: "answered",
    }));

    // Auto advance after 2 seconds
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleTimeUp = () => {
    setGameState((prev) => ({
      ...prev,
      hasAnswered: true,
      selectedAnswer: null,
      gamePhase: "answered",
    }));

    // Auto advance after 1 second
    setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  const nextQuestion = () => {
    if (!quiz) return;

    const nextIndex = gameState.currentQuestionIndex + 1;

    if (nextIndex >= quiz.questions.length) {
      // Game finished
      setGameState((prev) => ({ ...prev, gamePhase: "finished" }));
      return;
    }

    // Move to next question
    setGameState((prev) => ({
      ...prev,
      currentQuestionIndex: nextIndex,
      timeLeft: quiz.questions[nextIndex].time_limit,
      hasAnswered: false,
      selectedAnswer: null,
      gamePhase: "question",
    }));
  };

  // Update the restartQuiz function to properly reset timer
  const restartQuiz = () => {
    if (!quiz) return;

    setGameState({
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      timeLeft: quiz.questions[0].time_limit,
      hasAnswered: false,
      selectedAnswer: null,
      gamePhase: "question", // Make sure we start in question phase
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Memuat quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz tidak ditemukan
            </h2>
            <p className="text-gray-600 mb-4">
              Quiz tidak tersedia atau tidak publik.
            </p>
            <Link href="/dashboard">
              <Button>Kembali ke Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.gamePhase === "finished") {
    const accuracy =
      quiz.questions.length > 0
        ? (gameState.correctAnswers / quiz.questions.length) * 100
        : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] p-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-3xl">Quiz Selesai!</CardTitle>
              <p className="text-gray-600">Berikut adalah hasil Anda</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {quiz.title}
                </h2>
                <p className="text-gray-600">{quiz.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {gameState.score.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Poin</div>
                </div>
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {accuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Akurasi</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Jawaban Benar</span>
                  <span className="font-semibold">
                    {gameState.correctAnswers} dari {quiz.questions.length}
                  </span>
                </div>
                <Progress value={accuracy} className="h-2" />
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={restartQuiz}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Main Lagi
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[gameState.currentQuestionIndex];
  const progress =
    ((gameState.currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
          <div className="flex items-center space-x-2">
            <Slack className="w-6 h-6" />
            <span className="text-xl font-bold">Solo Play</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-lg font-bold">
                {gameState.score.toLocaleString()}
              </div>
              <div className="text-sm opacity-80">Poin</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {gameState.correctAnswers}
              </div>
              <div className="text-sm opacity-80">Benar</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-white mb-2">
            <span>
              Pertanyaan {gameState.currentQuestionIndex + 1} dari{" "}
              {quiz.questions.length}
            </span>
            {gameState.gamePhase === "question" && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-xl font-bold">{gameState.timeLeft}s</span>
              </div>
            )}
          </div>
          <Progress value={progress} className="bg-white/20" />
        </div>

        {/* Question */}
        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameState.gamePhase === "question" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.answers.map((answer) => (
                  <Button
                    key={answer.id}
                    onClick={() => submitAnswer(answer.id)}
                    className="h-20 text-lg font-semibold text-white hover:scale-105 transition-transform"
                    style={{ backgroundColor: answer.color }}
                  >
                    {answer.answer_text}
                  </Button>
                ))}
              </div>
            )}

            {gameState.gamePhase === "answered" && (
              <div className="text-center py-8">
                <div className="space-y-4">
                  {gameState.selectedAnswer ? (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {currentQuestion.answers.find(
                          (a) => a.id === gameState.selectedAnswer
                        )?.is_correct
                          ? "Benar!"
                          : "Salah!"}
                      </h3>
                      <div className="space-y-2">
                        {currentQuestion.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className={`p-3 rounded-lg flex items-center justify-between ${
                              answer.is_correct
                                ? "bg-green-100 border-2 border-green-500"
                                : answer.id === gameState.selectedAnswer
                                ? "bg-red-100 border-2 border-red-500"
                                : "bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: answer.color }}
                              />
                              <span className="font-medium">
                                {answer.answer_text}
                              </span>
                            </div>
                            {answer.is_correct && (
                              <span className="text-green-600 font-bold">
                                ✓ Jawaban Benar
                              </span>
                            )}
                            {answer.id === gameState.selectedAnswer &&
                              !answer.is_correct && (
                                <span className="text-red-600 font-bold">
                                  ✗ Pilihan Anda
                                </span>
                              )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Waktu Habis!
                      </h3>
                      <p className="text-gray-600">Jawaban yang benar:</p>
                      <div className="space-y-2">
                        {currentQuestion.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className={`p-3 rounded-lg flex items-center justify-between ${
                              answer.is_correct
                                ? "bg-green-100 border-2 border-green-500"
                                : "bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: answer.color }}
                              />
                              <span className="font-medium">
                                {answer.answer_text}
                              </span>
                            </div>
                            {answer.is_correct && (
                              <span className="text-green-600 font-bold">
                                ✓ Jawaban Benar
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer Progress */}
        {gameState.gamePhase === "question" && (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <Progress
                value={
                  ((currentQuestion.time_limit - gameState.timeLeft) /
                    currentQuestion.time_limit) *
                  100
                }
                className="h-3"
              />
              <div className="text-center mt-2 text-sm text-gray-600">
                Waktu tersisa: {gameState.timeLeft} detik
                {gameState.timeLeft <= 5 && (
                  <span className="text-red-600 font-bold ml-2 animate-pulse">
                    SEGERA!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
