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
  Menu,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isNavOpen, setIsNavOpen] = useState(false); // State for bottom navigation

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
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    redirect("/");
  }

  const displayName = userProfile?.username || user.email?.split("@")[0] || "User";

  const navigationLinks = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      title: "Buat Kuis",
      href: "/create",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      title: "Teman",
      href: "/dashboard/friends",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Riwayat",
      href: "/dashboard/history",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      title: "Profil",
      href: "/profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-gray-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-6000"></div>
      </div>
      
      {/* Header */}
      <header className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link href={"/"} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
              <Slack className="w-5 h-5 text-cyan-950" />
            </div>
            <span className="text-2xl font-bold text-white drop-shadow-md">GolekQuiz</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/join">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                Join Game
              </Button>
            </Link>
            <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
              <Avatar className="h-8 w-8 bg-white border-2 border-white">
                <AvatarImage
                  src={
                    userProfile?.avatar_url || `https://robohash.org/${encodeURIComponent(user.email || "guest")}.png`
                  }
                  alt={user.email || ""}
                />
                <AvatarFallback className="bg-white text-purple-600">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium hidden md:block">{displayName}</span>
            </div>
            <Button
              onClick={() => setIsNavOpen(true)}
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-white/20"
            >
              <Menu className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8 pt-0 relative z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 md:p-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600 text-lg">Selamat datang kembali, {displayName}!</p>
            </div>
            <Button
              onClick={() => router.push("/create")}
              className="mt-4 md:mt-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Buat Kuis Baru
            </Button>
          </div>

                      {/* Search Bar */}
          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Jelajahi Kuis</h2>
            <div className="relative w-full md:w-2/3 lg:w-1/2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari kuis berdasarkan judul, pembuat, atau deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/70 border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <Card className="bg-white/90 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kuis Saya</CardTitle>
                <BookOpen className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{myQuizzes.length}</div>
                <p className="text-xs text-muted-foreground">Total kuis yang Anda buat</p>
              </CardContent>
            </Card>
            <Card className="bg-white/90 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permainan Dimainkan</CardTitle>
                <Target className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{soloScores.length}</div>
                <p className="text-xs text-muted-foreground">Jumlah kuis solo yang diselesaikan</p>
              </CardContent>
            </Card>
            <Card className="bg-white/90 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Skor Terbaik</CardTitle>
                <Award className="h-5 w-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {soloScores.length > 0
                    ? `${Math.max(...soloScores.map((s) => Math.round((s.score / s.total_questions) * 100)))}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">Skor tertinggi Anda di kuis solo</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-200/50 rounded-lg p-1 shadow-inner">
              <TabsTrigger
                value="browse"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
              >
                Publik Quiz
              </TabsTrigger>
              <TabsTrigger
                value="my-quizzes"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
              >
                Private Quiz
              </TabsTrigger>
              <TabsTrigger
                value="scores"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
              >
                Riwayat Permainan
              </TabsTrigger>
            </TabsList>

            {/* Browse Public Quizzes Tab */}
            <TabsContent value="browse" className="space-y-6">
              <p className="text-sm text-gray-600">{filteredPublicQuizzes.length} kuis ditemukan</p>
              {loadingPublicQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-white/90 border-none shadow-md">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
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
                <Card className="bg-white/90 border-none shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm ? "Tidak ada kuis yang cocok" : "Belum ada Kuis Publik"}
                    </h3>
                    <p className="text-gray-600 text-center">
                      {searchTerm ? "Coba kata kunci lain" : "Jadilah yang pertama membuat Kuis Publik!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="bg-white/90 hover:shadow-lg transition-shadow duration-200 border-none shadow-md"
                    >
                      <CardHeader>
                        <div className="flex items-center space-x-3 mb-2">
                          <Avatar className="h-8 w-8 border-2 border-blue-400">
                            <AvatarImage src={quiz.creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {quiz.creator.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600 font-medium">{quiz.creator.username}</span>
                          {quiz.creator_id === user?.id && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              Kuis Anda
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 text-xl font-bold text-gray-800">{quiz.title}</CardTitle>
                        {quiz.description && (
                          <CardDescription className="line-clamp-2 text-gray-600">{quiz.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                              {quiz.questions?.length || 0} pertanyaan
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-green-600">
                              <Globe className="w-3 h-3" />
                              <span>Publik</span>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => router.push(`/host/${quiz.id}`)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                            disabled={!quiz.questions || quiz.questions.length === 0}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Host
                          </Button>
                          <Button
                            onClick={() => router.push(`/solo/${quiz.id}`)}
                            variant="outline"
                            className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 shadow-md"
                            disabled={!quiz.questions || quiz.questions.length === 0}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Solo
                          </Button>
                        </div>
                        {(!quiz.questions || quiz.questions.length === 0) && (
                          <p className="text-xs text-orange-600 mt-2 text-center">Kuis belum memiliki pertanyaan</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Quizzes Tab */}
            <TabsContent value="my-quizzes" className="space-y-6">
              {loadingMyQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-white/90 border-none shadow-md">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
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
                <Card className="bg-white/90 border-none shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Plus className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm ? "Tidak ada kuis yang cocok" : "Belum ada kuis"}
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      {searchTerm ? "Coba kata kunci lain" : "Buat kuis pertama Anda untuk memulai!"}
                    </p>
                    {!searchTerm && (
                      <Button 
                        onClick={() => router.push("/create")} 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Kuis
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="bg-white/90 hover:shadow-lg transition-shadow duration-200 border-none shadow-md"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="line-clamp-2 flex-1 text-xl font-bold text-gray-800">
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
                          <CardDescription className="line-clamp-2 text-gray-600">{quiz.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                              {quiz.questions?.length || 0} pertanyaan
                            </Badge>
                            <Badge
                              variant={quiz.is_public ? "default" : "outline"}
                              className={`text-xs ${quiz.is_public ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                            >
                              {quiz.is_public ? "Publik" : "Privat"}
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
                            className="border-purple-500 text-purple-500 hover:bg-purple-50 hover:text-purple-600 shadow-md bg-transparent"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => router.push(`/host/${quiz.id}`)}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                            disabled={!quiz.questions || quiz.questions.length === 0}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Host
                          </Button>
                          <Button
                            onClick={() => deleteQuiz(quiz.id)}
                            variant="destructive"
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white shadow-md"
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
              {loadingSoloScores ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-white/90 border-none shadow-md">
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
                <Card className="bg-white/90 border-none shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada riwayat permainan</h3>
                    <p className="text-gray-600 text-center mb-4">
                      Mainkan beberapa kuis untuk melihat riwayat Anda di sini!
                    </p>
                    <Button
                      onClick={() => router.push("/dashboard")}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Jelajah Kuis
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {soloScores.map((score) => (
                    <Card key={score.id} className="bg-white/90 border-none shadow-md">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-800">{score.quiz.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-gray-500" />
                                {new Date(score.completed_at).toLocaleDateString()}
                              </span>
                              <span>
                                {score.score}/{score.total_questions} benar
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                              {Math.round((score.score / score.total_questions) * 100)}%
                            </div>
                            <Badge
                              variant={
                                score.score / score.total_questions >= 0.8
                                  ? "default"
                                  : score.score / score.total_questions >= 0.6
                                    ? "secondary"
                                    : "destructive"
                              }
                              className={`text-xs ${
                                score.score / score.total_questions >= 0.8
                                  ? "bg-green-100 text-green-700"
                                  : score.score / score.total_questions >= 0.6
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {score.score / score.total_questions >= 0.8
                                ? "Sangat Baik"
                                : score.score / score.total_questions >= 0.6
                                  ? "Baik"
                                  : "Perlu Latihan"}
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

      {/* Bottom Navigation Menu */}
      {typeof window !== 'undefined' && (
        <AnimatePresence>
          {isNavOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black"
                onClick={() => setIsNavOpen(false)}
              />

              {/* Bottom Navigation */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {/* Handle Bar untuk swipe */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-12 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-lg mb-4 px-2 text-gray-900">Menu Navigasi</h3>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    {navigationLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setIsNavOpen(false)}>
                        <Button
                          variant={link.href === "/dashboard" ? "default" : "ghost"}
                          className="w-full justify-start text-lg py-6"
                        >
                          <div className="flex items-center gap-4">
                            <div className={link.href === "/dashboard" ? "text-white" : "text-gray-700"}>
                              {link.icon}
                            </div>
                            <span>{link.title}</span>
                          </div>
                        </Button>
                      </Link>
                    ))}

                    {/* Logout Button */}
                    <Button
                      variant="destructive"
                      className="w-full justify-start text-lg py-6 mt-4"
                      onClick={handleSignOut}
                    >
                      <div className="flex items-center gap-4">
                        <LogOut className="h-5 w-5" />
                        <span>Keluar</span>
                      </div>
                    </Button>
                  </div>

                  {/* Close Button */}
                  <div className="pt-4 pb-8">
                    <Button
                      onClick={() => setIsNavOpen(false)}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Tutup
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
