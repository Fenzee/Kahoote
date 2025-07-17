"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { redirect } from "next/navigation";
import {
  Plus,
  Play,
  Edit,
  Trash2,
  Users,
  Trophy,
  Clock,
  BookOpen,
  Target,
  Award,
  LogOut,
  Slack,
  Search,
  Globe,
  Lock,
} from "lucide-react";
import Link from "next/link";

interface SupabaseQuizResponse {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  creator_id: string;
  is_public: boolean;
  questions: Array<{
    id: string;
  }>;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface NormalizedQuiz {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_public: boolean;
  creator_id: string;
  creator: {
    username: string;
    avatar_url: string | null;
  };
  questions: Array<{
    id: string;
  }>;
}

interface SoloScore {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  quiz: {
    id: string;
    title: string;
  };
}

// Helper function to normalize quiz data from Supabase
const normalizeQuiz = (quiz: SupabaseQuizResponse): NormalizedQuiz => {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    created_at: quiz.created_at,
    is_public: quiz.is_public,
    creator_id: quiz.creator_id,
    creator: {
      username: quiz.profiles?.username || "Unknown User",
      avatar_url: quiz.profiles?.avatar_url || null,
    },
    questions: quiz.questions || [],
  };
};

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [publicQuizzes, setPublicQuizzes] = useState<NormalizedQuiz[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<NormalizedQuiz[]>([]);
  const [soloScores, setSoloScores] = useState<SoloScore[]>([]);
  const [loadingPublicQuizzes, setLoadingPublicQuizzes] = useState(true);
  const [loadingMyQuizzes, setLoadingMyQuizzes] = useState(true);
  const [loadingSoloScores, setLoadingSoloScores] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    avatar_url: string | null;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      fetchUserProfile();
      fetchPublicQuizzes();
      fetchMyQuizzes();
      fetchSoloScores();
    }
  }, [user, loading, router]);

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

  const fetchPublicQuizzes = async () => {
    try {
      setLoadingPublicQuizzes(true);

      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          created_at,
          creator_id,
          is_public,
          questions (
            id
          ),
          profiles!quizzes_creator_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (quizzesError) {
        console.error("Error fetching public quizzes:", quizzesError);
        return;
      }

      if (!quizzesData || quizzesData.length === 0) {
        setPublicQuizzes([]);
        return;
      }

      // Normalize the data
      const normalizedQuizzes = quizzesData.map(normalizeQuiz);
      setPublicQuizzes(normalizedQuizzes);
    } catch (error) {
      console.error("Error in fetchPublicQuizzes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch public quizzes",
        variant: "destructive",
      });
    } finally {
      setLoadingPublicQuizzes(false);
    }
  };

  const fetchMyQuizzes = async () => {
    if (!user) return;

    try {
      setLoadingMyQuizzes(true);

      const { data: myQuizzesData, error: myQuizzesError } = await supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          created_at,
          creator_id,
          is_public,
          questions (
            id
          ),
          profiles!quizzes_creator_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (myQuizzesError) {
        console.error("Error fetching my quizzes:", myQuizzesError);
        return;
      }

      if (!myQuizzesData || myQuizzesData.length === 0) {
        setMyQuizzes([]);
        return;
      }

      // Normalize the data
      const normalizedQuizzes = myQuizzesData.map(normalizeQuiz);
      setMyQuizzes(normalizedQuizzes);
    } catch (error) {
      console.error("Error in fetchMyQuizzes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your quizzes",
        variant: "destructive",
      });
    } finally {
      setLoadingMyQuizzes(false);
    }
  };

  const fetchSoloScores = async () => {
    if (!user) return;

    try {
      setLoadingSoloScores(true);

      const { data: scoresData, error: scoresError } = await supabase
        .from("solo_scores")
        .select(
          `
          id,
          score,
          total_questions,
          completed_at,
          quiz_id
        `
        )
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (scoresError) {
        console.error("Error fetching solo scores:", scoresError);
        return;
      }

      if (!scoresData || scoresData.length === 0) {
        setSoloScores([]);
        return;
      }

      const quizIds = [...new Set(scoresData.map((score) => score.quiz_id))];

      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, title")
        .in("id", quizIds);

      if (quizzesError) {
        console.error("Error fetching quiz titles:", quizzesError);
      }

      const scoresWithQuizzes = scoresData.map((score) => ({
        ...score,
        quiz: quizzesData?.find((q) => q.id === score.quiz_id) || {
          id: score.quiz_id,
          title: "Unknown Quiz",
        },
      }));

      setSoloScores(scoresWithQuizzes);
    } catch (error) {
      console.error("Error in fetchSoloScores:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your scores",
        variant: "destructive",
      });
    } finally {
      setLoadingSoloScores(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });

      fetchMyQuizzes();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  // const handleLogout = async () => {
  //   try {
  //     await signOut();
  //     router.push("/");
  //   } catch (error) {
  //     console.error("Error signing out:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to sign out",
  //       variant: "destructive",
  //     });
  //   }
  // };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Filter quizzes based on search term
  const filteredPublicQuizzes = publicQuizzes.filter(
    (quiz) =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.creator.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quiz.description &&
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMyQuizzes = myQuizzes.filter(
    (quiz) =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quiz.description &&
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    redirect("/");
  }

  const displayName =
    userProfile?.username || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href={"/"}>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Slack className="w-5 h-5 text-cyan-950" />
                </div>
                <span className="text-2xl font-bold text-white">MyLessons</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 ">
              <Avatar className="h-8 w-8 bg-white">
                <AvatarImage
                  src={`https://robohash.org/${encodeURIComponent(
                    user.email || "guest"
                  )}.png`}
                  alt={user.email || ""}
                />
                <AvatarFallback className="bg-white text-purple-600">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium">{displayName}</span>
            </div>
            {/* <Button
              onClick={handleSignOut}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8 pt-0">
        <div className="bg-[#A7CFDB] backdrop-blur-sm rounded-xl shadow-xl p-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {displayName}!</p>
            </div>
            <Button
              onClick={() => router.push("/create")}
              className="mt-4 md:mt-0"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Quiz
            </Button>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2 md:gap-6 md:mb-8 mb-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Quizzes
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myQuizzes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Games Played
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{soloScores.length}</div>
              </CardContent>
            </Card>
            {/* <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Best Score
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {soloScores.length > 0
                    ? `${Math.max(
                        ...soloScores.map((s) =>
                          Math.round((s.score / s.total_questions) * 100)
                        )
                      )}%`
                    : "0%"}
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Search Bar */}

          <div className="mb-2 md:mb-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
            <h2 className="text-2xl font-bold">Explore Quizzes</h2>
            <div className="relative w-[100%] md:w-[40%]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari quiz berdasarkan judul, pembuat, atau deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Publik Quiz</TabsTrigger>
              <TabsTrigger value="my-quizzes">Private Quiz</TabsTrigger>
              <TabsTrigger value="scores">My Score</TabsTrigger>
            </TabsList>

            {/* Browse Public Quizzes Tab */}
            <TabsContent value="browse" className="space-y-6">
              <div className="flex justify-between items-center">
                {/* <h2 className="text-2xl font-bold">Public Quizz</h2> */}
                <p className="text-sm text-gray-600">
                  {filteredPublicQuizzes.length} quiz ditemukan
                </p>
              </div>

              {loadingPublicQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPublicQuizzes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm
                        ? "Tidak ada quiz yang cocok"
                        : "Belum ada Public Quizz"}
                    </h3>
                    <p className="text-gray-600 text-center">
                      {searchTerm
                        ? "Coba kata kunci lain"
                        : "Jadilah yang pertama membuat Public Quizz!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center space-x-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={quiz.creator.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {quiz.creator.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">
                            {quiz.creator.username}
                          </span>
                          {quiz.creator_id === user?.id && (
                            <Badge variant="secondary" className="text-xs">
                              Quiz Anda
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2">
                          {quiz.title}
                        </CardTitle>
                        {quiz.description && (
                          <CardDescription className="line-clamp-2">
                            {quiz.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {quiz.questions?.length || 0} pertanyaan
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-green-600">
                              <Globe className="w-3 h-3" />
                              <span>Public</span>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => router.push(`/host/${quiz.id}`)}
                            className="flex-1"
                            disabled={
                              !quiz.questions || quiz.questions.length === 0
                            }
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Host
                          </Button>
                          <Button
                            onClick={() => router.push(`/solo/${quiz.id}`)}
                            variant="outline"
                            className="flex-1"
                            disabled={
                              !quiz.questions || quiz.questions.length === 0
                            }
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Solo
                          </Button>
                        </div>
                        {(!quiz.questions || quiz.questions.length === 0) && (
                          <p className="text-xs text-orange-600 mt-2 text-center">
                            Quiz belum memiliki pertanyaan
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Quizzes Tab */}
            <TabsContent value="my-quizzes" className="space-y-6">
              {/* <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Quiz Saya</h2>
                <Button onClick={() => router.push("/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Baru
                </Button>
              </div> */}

              {loadingMyQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredMyQuizzes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Plus className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm
                        ? "Tidak ada quiz yang cocok"
                        : "Belum ada quiz"}
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      {searchTerm
                        ? "Coba kata kunci lain"
                        : "Buat quiz pertama Anda untuk memulai!"}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => router.push("/create")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Quiz
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="line-clamp-2 flex-1">
                            {quiz.title}
                          </CardTitle>
                          <div className="flex items-center space-x-1 ml-2">
                            {quiz.is_public ? (
                              <div className="flex items-center space-x-1 text-green-600">
                                <Globe className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-orange-600">
                                <Lock className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                        {quiz.description && (
                          <CardDescription className="line-clamp-2">
                            {quiz.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {quiz.questions?.length || 0} pertanyaan
                            </Badge>
                            <Badge
                              variant={quiz.is_public ? "default" : "outline"}
                              className="text-xs"
                            >
                              {quiz.is_public ? "Public" : "Private"}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => router.push(`/edit/${quiz.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => router.push(`/host/${quiz.id}`)}
                            size="sm"
                            disabled={
                              !quiz.questions || quiz.questions.length === 0
                            }
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Host
                          </Button>
                          <Button
                            onClick={() => deleteQuiz(quiz.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {(!quiz.questions || quiz.questions.length === 0) && (
                          <p className="text-xs text-orange-600 mt-2 text-center">
                            Tambahkan pertanyaan untuk mengaktifkan hosting
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Scores Tab */}
            <TabsContent value="scores" className="space-y-6">
              {/* <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Skor Saya</h2>
              </div> */}

              {loadingSoloScores ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : soloScores.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Belum ada skor
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      Mainkan beberapa quiz untuk melihat skor Anda di sini!
                    </p>
                    <Button onClick={() => router.push("/dashboard")}>
                      <Play className="w-4 h-4 mr-2" />
                      Jelajah Quiz
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {soloScores.map((score) => (
                    <Card key={score.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {score.quiz.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(
                                  score.completed_at
                                ).toLocaleDateString()}
                              </span>
                              <span>
                                {score.score}/{score.total_questions} benar
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {Math.round(
                                (score.score / score.total_questions) * 100
                              )}
                              %
                            </div>
                            <Badge
                              variant={
                                score.score / score.total_questions >= 0.8
                                  ? "default"
                                  : score.score / score.total_questions >= 0.6
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {score.score / score.total_questions >= 0.8
                                ? "Excellent"
                                : score.score / score.total_questions >= 0.6
                                ? "Good"
                                : "Needs Practice"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
