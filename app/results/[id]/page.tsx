"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import {
  Trophy,
  Medal,
  Award,
  Users,
  Target,
  Clock,
  TrendingUp,
  Download,
  Share2,
  Home,
  BarChart3,
  CheckCircle,
  XCircle,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";

interface GameSession {
  id: string;
  quiz_id: string;
  host_id: string;
  // game_pin: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  quiz: {
    title: string;
    description: string | null;
  };
}

interface Participant {
  id: string;
  nickname: string;
  score: number;
  joined_at: string;
  user_id: string | null;
}

interface QuestionStats {
  question_id: string;
  question_text: string;
  total_responses: number;
  correct_responses: number;
  average_time: number;
  points: number;
}

interface PersonalStats {
  total_questions: number;
  correct_answers: number;
  total_points: number;
  average_time: number;
  fastest_answer: number;
  rank: number;
  total_participants: number;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const participantId = searchParams.get("participant");

  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(
    null
  );
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// useEffect(() => {
//   if (
//     gameSession &&
//     participants.length > 0 &&
//     user?.id &&
//     gameSession.quiz_id
//   ) {
//     fetchPersonalStats(user.id, participants, gameSession.quiz_id);
//   }
// }, [gameSession, participants, user]);

// useEffect(() => {
//   if (
//     gameSession &&
//     participants.length > 0 &&
//     user?.id &&
//     gameSession.quiz_id
//   ) {
//     console.log("User ID:", user.id);
//     console.log("Participants:", participants);
//     fetchPersonalStats(user.id, participants, gameSession.quiz_id);
//   } else {
//     console.log("⛔ Belum siap: ", {
//       gameSession,
//       participantsLength: participants.length,
//       userId: user?.id,
//     });
//   }
// }, [gameSession, participants, user]);



  useEffect(() => {
    fetchResults();
  }, [resolvedParams.id, user, participantId]);

  const fetchResults = async () => {
    try {
      console.log("Fetching results for session:", resolvedParams.id);
      console.log("User:", user);
      console.log("Participant ID:", participantId);
      
      //test
      const fetchParticipants = async () => {
  const { data, error } = await supabase
    .from("game_participants")
    .select("*")
    .eq("session_id", resolvedParams.id);

  if (error) {
    console.error("Gagal mengambil participants:", error);
  } else {
    console.log("✅ Participants berhasil dimuat:", data);
    setParticipants(data);
  }
};
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select(
          `
          id,
          quiz_id,
          host_id,
          status,
          started_at,
          ended_at,
          quiz:quizzes (
            title,
            description
          )
        `
        )
        .eq("id", resolvedParams.id)
        .single();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        throw new Error("Game session tidak ditemukan");
      }

      console.log("Game session:", session);
      // setGameSession({
      //   ...session,
      //   quiz: session.quizzes[0], 
      // } as GameSession);
      setGameSession(session as unknown as GameSession);


      const userIsHost = user ? session.host_id === user.id : false;
      setIsHost(userIsHost);

      const { data: participantsData, error: participantsError } =
        await supabase
          .from("game_participants")
          .select("*")
          .eq("session_id", resolvedParams.id)
          .order("score", { ascending: false });

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        throw new Error("Gagal memuat data peserta");
      }

      console.log("Participants:", participantsData);
      setParticipants(participantsData);

      if (userIsHost) {
        await fetchQuestionStats(session.quiz_id);
      }

      if (participantId) {
        await fetchPersonalStats(
          participantId,
          participantsData,
          session.quiz_id
        );
      }
    } catch (error: any) {
      console.error("Error fetching results:", error);
      setError(error.message || "Terjadi kesalahan saat memuat hasil");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionStats = async (quizId: string) => {
    try {
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id, question_text, points")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      const stats: QuestionStats[] = [];

      for (const question of questions) {
        const { data: responses, error: responsesError } = await supabase
          .from("game_responses")
          .select(
            `
            *,
            answers (
              is_correct
            )
          `
          )
          .eq("session_id", resolvedParams.id)
          .eq("question_id", question.id);

        if (responsesError) continue;

        const totalResponses = responses.length;
        const correctResponses = responses.filter(
          (r) => r.answers?.is_correct
        ).length;
        const averageTime =
          responses.length > 0
            ? responses.reduce((sum, r) => sum + (r.response_time || 0), 0) /
              responses.length /
              1000
            : 0;

        stats.push({
          question_id: question.id,
          question_text: question.question_text,
          total_responses: totalResponses,
          correct_responses: correctResponses,
          average_time: Math.round(averageTime),
          points: question.points,
        });
      }

      setQuestionStats(stats);
    } catch (error) {
      console.error("Error fetching question stats:", error);
    }
  };

  const fetchPersonalStats = async (
    participantId: string,
    allParticipants: Participant[],
    quizId: string
  ) => {
    try {
      const { data: responses, error: responsesError } = await supabase
        .from("game_responses")
        .select(
          `
          *,
          answers (
            is_correct
          )
        `
        )
        .eq("session_id", resolvedParams.id)
        .eq("participant_id", participantId);

      if (responsesError) throw responsesError;

      const participant = allParticipants.find((p) => p.id === participantId);
      if (!participant) throw new Error("Participant tidak ditemukan");

      // 🆕 Tambahkan bagian ini
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .eq("quiz_id", quizId); // Pakai non-null assertion karena sudah dicek di atas

      if (questionsError) throw questionsError;

      const totalQuestions = questions.length;
      // ⬆️

      const correctAnswers = responses.filter(
        (r) => r.answers?.is_correct
      ).length;
      const totalPoints = participant.score;
      const averageTime =
        responses.length > 0
          ? responses.reduce((sum, r) => sum + (r.response_time || 0), 0) /
            responses.length /
            1000
          : 0;
      const fastestAnswer =
        responses.length > 0
          ? Math.min(...responses.map((r) => r.response_time || 0)) / 1000
          : 0;

      const participantsWithHigherScores = allParticipants.filter(
        (p) => p.score > participant.score
      );
      const rank = participantsWithHigherScores.length + 1;

      

      setPersonalStats({
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        total_points: totalPoints,
        average_time: Math.round(averageTime),
        fastest_answer: Math.round(fastestAnswer),
        rank,
        total_participants: allParticipants.length,

        
      });
    } catch (error) {
      console.error("Error fetching personal stats:", error);
    }
  };

  const exportResults = async () => {
    if (!gameSession || !isHost) return;

    try {
      const csvContent = [
        ["Rank", "Nickname", "Score", "Joined At"],
        ...participants.map((p, index) => [
          index + 1,
          p.nickname,
          p.score,
          new Date(p.joined_at).toLocaleString("id-ID"),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${gameSession.quiz.title}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting results:", error);
    }
  };

  const shareResults = async () => {
    if (!personalStats) return;

    const shareText = `🎉 Saya mendapat peringkat #${personalStats.rank} dari ${personalStats.total_participants} pemain dengan ${personalStats.total_points} poin di MyLessons!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Hasil MyLessons",
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Hasil berhasil disalin ke clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/join")} className="bg-purple-600 hover:bg-purple-700">Kembali</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hasil tidak ditemukan
            </h2>
            <p className="text-gray-600 mb-4">
              Sesi game tidak valid atau sudah berakhir.
            </p>
            <Button onClick={() => router.push("/join")} className="bg-purple-600 hover:bg-purple-700">Kembali</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topThree = participants.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      {/* Confetti Animation Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 left-1/4 w-4 h-4 bg-yellow-500 rounded-full animate-confetti-fall-slow"></div>
        <div className="absolute -top-10 left-1/3 w-3 h-3 bg-purple-500 rounded-full animate-confetti-fall-medium"></div>
        <div className="absolute -top-10 left-1/2 w-5 h-5 bg-blue-500 rounded-full animate-confetti-fall-fast"></div>
        <div className="absolute -top-10 left-2/3 w-4 h-4 bg-green-500 rounded-full animate-confetti-fall-slow"></div>
        <div className="absolute -top-10 left-3/4 w-3 h-3 bg-red-500 rounded-full animate-confetti-fall-medium"></div>
        <div className="absolute -top-10 left-10 w-2 h-2 bg-pink-500 rounded-full animate-confetti-fall-fast"></div>
        <div className="absolute -top-10 right-10 w-6 h-6 bg-indigo-500 rounded-full animate-confetti-fall-slow"></div>
        <div className="absolute -top-10 right-1/4 w-3 h-3 bg-yellow-300 rounded-full animate-confetti-fall-medium"></div>
        <div className="absolute -top-10 right-1/3 w-4 h-4 bg-purple-300 rounded-full animate-confetti-fall-fast"></div>
        <div className="absolute -top-10 right-1/2 w-5 h-5 bg-blue-300 rounded-full animate-confetti-fall-slow"></div>
        <div className="absolute -top-10 right-2/3 w-3 h-3 bg-green-300 rounded-full animate-confetti-fall-medium"></div>
        <div className="absolute -top-10 right-3/4 w-4 h-4 bg-red-300 rounded-full animate-confetti-fall-fast"></div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 md:px-6 lg:px-8 border-b">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-purple-600 animate-bounce" />
          <div className="flex flex-col">
            <span className="font-bold text-lg">Hasil Game</span>
            <span className="text-sm text-gray-500">{gameSession.quiz.title}</span>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          {isHost ? (
            <>
              <Button
                onClick={exportResults}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent transition-all hover:scale-105"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent transition-all hover:scale-105"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </>
          ) : (
            <>
              {personalStats && (
                <Button
                  onClick={shareResults}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent transition-all hover:scale-105"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan
                </Button>
              )}
              <Button
                onClick={() => router.push("/join")}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent transition-all hover:scale-105"
              >
                <Home className="w-4 h-4 mr-2" />
                Main Lagi
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 lg:py-16 space-y-8">
        {personalStats && !isHost && (
          <Card className="bg-white shadow-lg rounded-xl p-6 transform transition-all hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Trophy className="w-10 h-10 text-white animate-bounce" />
              </div>
              <CardTitle className="text-3xl animate-fade-in">Hasil Anda</CardTitle>
              <p className="text-gray-600">
                Selamat telah menyelesaikan game!
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg transform transition-all hover:scale-105 hover:bg-purple-100">
                  <div className="text-3xl font-bold text-purple-600 animate-number-pop">
                    #{personalStats.rank}
                  </div>
                  <div className="text-sm text-gray-600">Peringkat</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg transform transition-all hover:scale-105 hover:bg-green-100">
                  <div className="text-3xl font-bold text-green-600 animate-number-pop">
                    {personalStats.total_points.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Poin</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg transform transition-all hover:scale-105 hover:bg-blue-100">
                  <div className="text-3xl font-bold text-blue-600 animate-number-pop">
                    {personalStats.correct_answers}/
                    {personalStats.total_questions}
                  </div>
                  <div className="text-sm text-gray-600">Benar</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {topThree.length > 0 && (
          <Card className="bg-white shadow-lg rounded-xl p-6 transform transition-all hover:shadow-xl">
            <CardHeader className="pb-4 px-0 pt-0 flex flex-row items-center justify-center gap-2">
              <Award className="w-6 h-6 text-yellow-500 animate-pulse" />
              <CardTitle className="text-xl font-semibold">Podium Pemenang</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-4">
              <div className="flex items-end justify-center space-x-4">
                {topThree[1] && (
                  <div className="flex flex-col items-center text-center transform transition-all hover:scale-105">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-2 animate-bounce-slow">
                    <span className="text-4xl">🥈</span>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 h-24 flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="font-bold text-gray-800">
                        {topThree[1].nickname}
                      </div>
                      <div className="text-2xl font-bold text-gray-600 animate-number-pop">
                        {topThree[1].score.toLocaleString()}
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 mt-1">
                        🥈 2nd
                      </Badge>
                    </div>
                  </div>
                )}

                {topThree[0] && (
                  <div className="flex flex-col items-center text-center transform transition-all hover:scale-105 z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 h-32 flex flex-col justify-center border-2 border-yellow-300 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="font-bold text-yellow-800">
                        {topThree[0].nickname}
                      </div>
                      <div className="text-3xl font-bold text-yellow-600 animate-number-pop">
                        {topThree[0].score.toLocaleString()}
                      </div>
                      <Badge className="bg-yellow-400 text-white mt-1">
                        🥇 1st
                      </Badge>
                    </div>
                  </div>
                )}

                {topThree[2] && (
                  <div className="flex flex-col items-center text-center transform transition-all hover:scale-105">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mb-2 animate-bounce-slow">
                    <span className="text-4xl">🥉</span>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 h-24 flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="font-bold text-amber-800">
                        {topThree[2].nickname}
                      </div>
                      <div className="text-2xl font-bold text-amber-600 animate-number-pop">
                        {topThree[2].score.toLocaleString()}
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 mt-1">
                        🥉 3rd
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-lg rounded-xl p-6 transform transition-all hover:shadow-xl">
          <CardHeader className="pb-4 px-0 pt-0 flex flex-row items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <CardTitle className="text-xl font-semibold">
              Leaderboard ({participants.length} Pemain)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    index < 3
                      ? "bg-yellow-50 hover:bg-yellow-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  } transform hover:scale-[1.01] hover:shadow-md ${
                    participant.id === participantId ? "ring-2 ring-purple-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${
                      index === 0 ? "text-yellow-800" : 
                      index === 1 ? "text-gray-600" : 
                      index === 2 ? "text-amber-800" : "text-gray-600"
                    }`}>{index + 1}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? "bg-yellow-400 text-white" : 
                      index === 1 ? "bg-gray-300 text-white" : 
                      index === 2 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}>
                      {participant.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">
                        {participant.nickname}
                      </span>
                      <span className="text-xs text-gray-500">
                        Bergabung: {new Date(participant.joined_at).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-gray-800 animate-number-pop">
                    {participant.score.toLocaleString()} poin
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isHost && questionStats.length > 0 && (
          <Card className="bg-white shadow-lg rounded-xl p-6 transform transition-all hover:shadow-xl">
            <CardHeader className="pb-4 px-0 pt-0 flex flex-row items-center gap-2">
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <CardTitle className="text-xl font-semibold">
                Statistik Pertanyaan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-4">
              {questionStats.map((stat, index) => (
                <div
                  key={stat.question_id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Pertanyaan {index + 1}</h3>
                    <Badge className="bg-gray-100 text-gray-700">
                      {stat.points} poin
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-4">{stat.question_text}</p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-blue-100">
                      <Users className="w-6 h-6 text-blue-600 mb-1" />
                      <div className="text-xl font-bold text-blue-600 animate-number-pop">
                        {stat.total_responses}
                      </div>
                      <div className="text-sm text-gray-600">Total Jawaban</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-green-100">
                      <CheckCircle className="w-6 h-6 text-green-600 mb-1" />
                      <div className="text-xl font-bold text-green-600 animate-number-pop">
                        {stat.correct_responses}
                      </div>
                      <div className="text-sm text-gray-600">Jawaban Benar</div>
                    </div>
                  </div>

                  {stat.total_responses > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Tingkat Kebenaran</span>
                        <span className="font-medium">
                          {Math.round((stat.correct_responses / stat.total_responses) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-400 animate-progress-bar" 
                          style={{ 
                            width: `${Math.round((stat.correct_responses / stat.total_responses) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-lg rounded-xl p-6 transform transition-all hover:shadow-xl">
          <CardHeader className="pb-4 px-0 pt-0 flex flex-row items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-gray-600" />
            <CardTitle className="text-xl font-semibold">Ringkasan Game</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-blue-100">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-600 animate-number-pop">
                  {participants.length}
                </div>
                <div className="text-sm text-gray-600">Total Pemain</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-green-100">
                <HelpCircle className="w-8 h-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold text-green-600 animate-number-pop">
                  {isHost ? questionStats.length : personalStats?.total_questions ?? 0}
                </div>
                <div className="text-sm text-gray-600">Total Pertanyaan</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-purple-100">
                <Trophy className="w-8 h-8 text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-purple-600 animate-number-pop">
                  {participants.length > 0
                    ? Math.max(
                        ...participants.map((p) => p.score)
                      ).toLocaleString()
                    : 0}
                </div>
                <div className="text-sm text-gray-600">Skor Tertinggi</div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg flex flex-col items-center transform transition-all hover:scale-105 hover:bg-orange-100">
                <Clock className="w-8 h-8 text-orange-600 mb-2" />
                <div className="text-2xl font-bold text-orange-600 animate-number-pop">
                  {gameSession.ended_at && gameSession.started_at
                    ? Math.round(
                        (new Date(gameSession.ended_at).getTime() -
                          new Date(gameSession.started_at).getTime()) /
                          60000
                      )
                    : "0"}
                </div>
                <div className="text-sm text-gray-600">Durasi (menit)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
