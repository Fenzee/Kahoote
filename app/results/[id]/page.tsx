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
      setGameSession(session as GameSession);


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
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/join")}>Kembali</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hasil tidak ditemukan
            </h2>
            <p className="text-gray-600 mb-4">
              Sesi game tidak valid atau sudah berakhir.
            </p>
            <Button onClick={() => router.push("/join")}>Kembali</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topThree = participants.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🏆 Hasil Game
            </h1>
            <p className="text-white/80">{gameSession.quiz.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            {isHost ? (
              <>
                <Button
                  onClick={exportResults}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                {personalStats && (
                  <Button
                    onClick={shareResults}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Bagikan
                  </Button>
                )}
                <Button
                  onClick={() => router.push("/join")}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Main Lagi
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {personalStats && !isHost && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl">Hasil Anda</CardTitle>
                <p className="text-gray-600">
                  Selamat telah menyelesaikan game!
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      #{personalStats.rank}
                    </div>
                    <div className="text-sm text-gray-600">Peringkat</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {personalStats.total_points.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Poin</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {personalStats.correct_answers}/
                      {personalStats.total_questions}
                    </div>
                    <div className="text-sm text-gray-600">Benar</div>
                  </div>
                  {/* <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {personalStats.average_time}s
                    </div>
                    <div className="text-sm text-gray-600">Rata-rata</div>
                  </div> */}
                </div>
              </CardContent>
            </Card>
          )}

          {topThree.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  Podium Pemenang
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-center space-x-4">
                  {topThree[1] && (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-2">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4 h-24 flex flex-col justify-center">
                        <div className="font-bold text-gray-800">
                          {topThree[1].nickname}
                        </div>
                        <div className="text-2xl font-bold text-gray-600">
                          {topThree[1].score.toLocaleString()}
                        </div>
                        <div className=" bg-yellow-500 text-white text-xs mt-1 rounded-full px-2 py-1">
                          🥈 2nd
                        </div>
                      </div>
                    </div>
                  )}

                  {topThree[0] && (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-2">
                        <Trophy className="w-10 h-10 text-white" />
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4 h-32 flex flex-col justify-center border-2 border-yellow-300">
                        <div className="font-bold text-yellow-800">
                          {topThree[0].nickname}
                        </div>
                        <div className="text-3xl font-bold text-yellow-600">
                          {topThree[0].score.toLocaleString()}
                        </div>
                        <div className="bg-yellow-500 text-white text-xs mt-1 rounded-full px-2 py-1">
                          🥇 1st
                        </div>
                      </div>
                    </div>
                  )}

                  {topThree[2] && (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mb-2">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 h-24 flex flex-col justify-center">
                        <div className="font-bold text-amber-800">
                          {topThree[2].nickname}
                        </div>
                        <div className="text-2xl font-bold text-amber-600">
                          {topThree[2].score.toLocaleString()}
                        </div>
                        <div className="bg-yellow-500 text-white text-xs mt-1 rounded-full px-2 py-1">
                          🥉 3rd
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Leaderboard Lengkap ({participants.length} Pemain)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index < 3
                        ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200"
                        : "bg-gray-50 hover:bg-gray-100"
                    } transition-colors`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                            ? "bg-amber-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {participant.nickname}
                        </div>
                        <div className="text-sm text-gray-500">
                          Bergabung:{" "}
                          {new Date(participant.joined_at).toLocaleTimeString(
                            "id-ID"
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {participant.score.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">poin</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHost && questionStats.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Statistik Pertanyaan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questionStats.map((stat, index) => (
                    <div
                      key={stat.question_id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            Pertanyaan {index + 1}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {stat.question_text}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {stat.points} poin
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">

                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Users className="w-4 h-4 text-blue-500 mr-1" />
                            <span className="text-2xl font-bold text-blue-600">
                              {stat.total_responses}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Total Jawaban
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                            <span className="text-2xl font-bold text-green-600">
                              {stat.correct_responses}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Jawaban Benar
                          </div>
                        </div>

                        {/* <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Clock className="w-4 h-4 text-orange-500 mr-1" />
                            <span className="text-2xl font-bold text-orange-600">
                              {stat.average_time}s
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Rata-rata Waktu
                          </div>
                        </div> */}
                      </div>

                      {stat.total_responses > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Tingkat Kebenaran</span>
                            <span>
                              {Math.round(
                                (stat.correct_responses /
                                  stat.total_responses) *
                                  100
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              (stat.correct_responses / stat.total_responses) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Ringkasan Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {participants.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Pemain</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                        {isHost ? questionStats.length : personalStats?.total_questions ?? 0}

                  </div>
                  <div className="text-sm text-gray-600">Total Pertanyaan</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Trophy className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {participants.length > 0
                      ? Math.max(
                          ...participants.map((p) => p.score)
                        ).toLocaleString()
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Skor Tertinggi</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">
                    {gameSession.ended_at && gameSession.started_at
                      ? Math.round(
                          (new Date(gameSession.ended_at).getTime() -
                            new Date(gameSession.started_at).getTime()) /
                            60000
                        )
                      : "N/A"}
                  </div>
                  <div className="text-sm text-gray-600">Durasi (menit)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
