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
  Filter,
  Book,
  Beaker,
  Calculator,
  Dumbbell,
  Film,
  Briefcase,
  Languages,
  Laptop,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ActionSearchBar from "@/components/ui/action-search-bar";

interface SupabaseQuizResponse {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  creator_id: string;
  is_public: boolean;
  category: string;
  language: string;
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
  category: string;
  language: string;
  creator: {
    username: string;
    avatar_url: string | null;
  };
  questions: Array<{
    id: string;
  }>;
}

interface GameHistoryEntry {
  id: string;
  session_id: string;
  score: number;
  joined_at: string;
  game_sessions: {
    id: string;
    quiz_id: string;
    ended_at: string | null;
    status: string;
    quizzes: {
      id: string;
      title: string;
    };
  };
}

// Helper function to normalize quiz data from Supabase
const normalizeQuiz = (quiz: any): NormalizedQuiz => {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    created_at: quiz.created_at,
    is_public: quiz.is_public,
    creator_id: quiz.creator_id,
    category: quiz.category || "general",
    language: quiz.language || "id",
    creator: {
      username: quiz.profiles?.username || "Unknown User",
      avatar_url: quiz.profiles?.avatar_url || null,
    },
    questions: quiz.questions || [],
  };
};

// Kategori dan bahasa
const categories = [
  {
    value: "all",
    label: "Semua Kategori",
    icon: <Book className="h-4 w-4 text-blue-500" />,
  },
  {
    value: "general",
    label: "Umum",
    icon: <BookOpen className="h-4 w-4 text-gray-500" />,
  },
  {
    value: "science",
    label: "Sains",
    icon: <Beaker className="h-4 w-4 text-green-500" />,
  },
  {
    value: "math",
    label: "Matematika",
    icon: <Calculator className="h-4 w-4 text-red-500" />,
  },
  {
    value: "history",
    label: "Sejarah",
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
  },
  {
    value: "geography",
    label: "Geografi",
    icon: <Globe className="h-4 w-4 text-teal-500" />,
  },
  {
    value: "language",
    label: "Bahasa",
    icon: <Languages className="h-4 w-4 text-purple-500" />,
  },
  {
    value: "technology",
    label: "Teknologi",
    icon: <Laptop className="h-4 w-4 text-blue-500" />,
  },
  {
    value: "sports",
    label: "Olahraga",
    icon: <Dumbbell className="h-4 w-4 text-orange-500" />,
  },
  {
    value: "entertainment",
    label: "Hiburan",
    icon: <Film className="h-4 w-4 text-pink-500" />,
  },
  {
    value: "business",
    label: "Bisnis",
    icon: <Briefcase className="h-4 w-4 text-indigo-500" />,
  },
];

const languages = [
  { value: "all", label: "Semua Bahasa" },
  { value: "id", label: "Indonesia" },
  { value: "en", label: "Inggris" },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [publicQuizzes, setPublicQuizzes] = useState<NormalizedQuiz[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<NormalizedQuiz[]>([]);
  const [loadingPublicQuizzes, setLoadingPublicQuizzes] = useState(true);
  const [loadingMyQuizzes, setLoadingMyQuizzes] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    avatar_url: string | null;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false); // State for bottom navigation
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  const [loadingGameHistory, setLoadingGameHistory] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      fetchUserProfile();
      fetchPublicQuizzes();
      fetchMyQuizzes();
      fetchGameHistory();
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

      let query = supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          created_at,
          creator_id,
          is_public,
          category,
          language,
          questions (
            id
          ),
          profiles!quizzes_creator_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq("is_public", true);

      // Tambahkan filter kategori jika dipilih
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      // Tambahkan filter bahasa jika dipilih
      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter);
      }

      const { data: quizzesData, error: quizzesError } = await query
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

      let query = supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          created_at,
          creator_id,
          is_public,
          category,
          language,
          questions (
            id
          ),
          profiles!quizzes_creator_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq("creator_id", user.id);

      // Tambahkan filter kategori jika dipilih
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      // Tambahkan filter bahasa jika dipilih
      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter);
      }

      const { data: myQuizzesData, error: myQuizzesError } = await query.order(
        "created_at",
        { ascending: false }
      );

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

  const fetchGameHistory = async () => {
    if (!user) return;

    try {
      setLoadingGameHistory(true);

      const { data, error } = await supabase
        .from("game_participants")
        .select(
          `
    id,
    session_id,
    score,
    joined_at,
    game_sessions:game_sessions!game_participants_session_id_fkey (
      id,
      quiz_id,
      ended_at,
      status,
      quizzes:quizzes!game_sessions_quiz_id_fkey (
        id,
        title
      )
    )
  `
        )
        .eq("user_id", user.id)
        .eq("game_sessions.status", "finished")
        .order("joined_at", { ascending: false });

      if (error) throw error;

      // const normalized = data.map((entry) => ({
      //   id: entry.id,
      //   session_id: entry.session_id,
      //   score: entry.score,
      //   joined_at: entry.joined_at,
      //   game_sessions: {
      //     id: entry.game_sessions?.id,
      //     quiz_id: entry.game_sessions?.quiz_id,
      //     ended_at: entry.game_sessions?.ended_at,
      //     status: entry.game_sessions?.status,
      //     quizzes: {
      //       id: entry.game_sessions?.quizzes?.id,
      //       title: entry.game_sessions?.quizzes?.title,
      //     },
      //   },
      // }));
      const filtered = data.filter(
        (entry) => entry.game_sessions?.status === "finished"
      );

      setGameHistory(filtered);
    } catch (error) {
      console.error("Error fetching game history:", error);
    } finally {
      setLoadingGameHistory(false);
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
      router.push("../");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  // Effect to refetch quizzes when filters change
  useEffect(() => {
    if (user) {
      fetchPublicQuizzes();
      fetchMyQuizzes();
    }
  }, [categoryFilter, languageFilter]);

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

  // Convert categories to actions for ActionSearchBar
  const categoryActions = categories.map((cat) => ({
    id: cat.value,
    label: cat.label,
    icon: cat.icon,
    description: "",
    end: "Kategori",
  }));

  // Handle category selection from ActionSearchBar
  const handleCategorySelect = (action: any) => {
    setCategoryFilter(action.id);
  };

  // Handle search term change
  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };
  const totalGamesPlayed = gameHistory.length;

  const bestGameScore =
    gameHistory.length > 0 ? Math.max(...gameHistory.map((g) => g.score)) : 0;

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

  const displayName =
    userProfile?.username || user.email?.split("@")[0] || "User";

  const navigationLinks = [
    {
      title: "Dashboard",
      href: "../dashboard",
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
      href: "../dashboard/friends",
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
      href: "../dashboard/history",
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
      href: "../dashboard/profile",
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

  // Render category badge with icon
  const renderCategoryBadge = (category: string) => {
    const categoryObj = categories.find((c) => c.value === category);
    if (!categoryObj) return null;

    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
      >
        {categoryObj.icon}
        {categoryObj.label}
      </Badge>
    );
  };

  const renderLanguageBadge = (language: string) => {
    const languageObj = languages.find((l) => l.value === language);
    return (
      <Badge
        variant="outline"
        className="bg-purple-50 text-purple-700 border-purple-200"
      >
        {languageObj?.label || "Indonesia"}
      </Badge>
    );
  };

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
            <span className="text-2xl font-bold text-white drop-shadow-md">
              GolekQuiz
            </span>
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
                    userProfile?.avatar_url ||
                    `https://robohash.org/${encodeURIComponent(
                      user.email || "guest"
                    )}.png`
                  }
                  alt={user.email || ""}
                />
                <AvatarFallback className="bg-white text-purple-600">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium hidden md:block">
                {displayName}
              </span>
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Selamat datang kembali, {displayName}!
              </p>
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

          {/* Search Bar with Categories */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Jelajahi Kuis
              </h2>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border-gray-300"
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                >
                  <Filter className="h-4 w-4" />
                  {categoryFilter !== "all"
                    ? categories.find((c) => c.value === categoryFilter)?.label
                    : "Filter Kategori"}
                </Button>
              </div>
            </div>

            {/* Modern Search Bar */}
            <div className="h-[4.5rem]">
              <ActionSearchBar
                actions={categoryActions}
                onActionSelect={handleCategorySelect}
                onSearch={handleSearch}
                placeholder="Cari kuis berdasarkan judul, pembuat, atau deskripsi..."
                label="Cari atau pilih kategori"
              />
            </div>

            {/* Category Filters */}
            {showCategoryFilter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-white p-4 rounded-lg border border-gray-200 absolute z-40 w-full shadow-lg"
                style={{ maxHeight: "60vh", overflowY: "auto" }}
              >
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Filter berdasarkan kategori:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.value}
                      variant={
                        categoryFilter === category.value
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer flex items-center gap-1 ${
                        categoryFilter === category.value
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-white hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setCategoryFilter(category.value);
                        setShowCategoryFilter(false); // Hide filter after selection
                      }}
                    >
                      {category.icon}
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Spacer div to ensure content below has proper spacing when filter is shown */}
            {showCategoryFilter && <div className="h-20"></div>}
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
                <p className="text-xs text-muted-foreground">
                  Total kuis yang Anda buat
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/90 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Permainan Dimainkan
                </CardTitle>
                <Target className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalGamesPlayed}</div>
                <p className="text-xs text-muted-foreground">
                  Jumlah kuis yang pernah dimainkan
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/90 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Skor Terbaik
                </CardTitle>
                <Award className="h-5 w-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{bestGameScore}</div>
                <p className="text-xs text-muted-foreground">
                  Skor tertinggi Anda di kuis
                </p>
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
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
              >
                Riwayat Permainan
              </TabsTrigger>
            </TabsList>

            {/* Browse Public Quizzes Tab */}
            <TabsContent value="browse" className="space-y-6">
              <p className="text-sm text-gray-600">
                {filteredPublicQuizzes.length} kuis ditemukan
              </p>
              {loadingPublicQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card
                      key={i}
                      className="animate-pulse bg-white/90 border-none shadow-md"
                    >
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
                      {searchTerm
                        ? "Tidak ada kuis yang cocok"
                        : "Belum ada Kuis Publik"}
                    </h3>
                    <p className="text-gray-600 text-center">
                      {searchTerm
                        ? "Coba kata kunci lain"
                        : "Jadilah yang pertama membuat Kuis Publik!"}
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
                            <AvatarImage
                              src={quiz.creator.avatar_url || undefined}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {quiz.creator.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600 font-medium">
                            {quiz.creator.username}
                          </span>
                          {quiz.creator_id === user?.id && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-purple-100 text-purple-700"
                            >
                              Kuis Anda
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 text-xl font-bold text-gray-800">
                          {quiz.title}
                        </CardTitle>
                        {quiz.description && (
                          <CardDescription className="line-clamp-2 text-gray-600">
                            {quiz.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Badge
                            variant="secondary"
                            className="bg-gray-200 text-gray-700"
                          >
                            {quiz.questions?.length || 0} pertanyaan
                          </Badge>
                          <div className="flex items-center space-x-1 text-xs text-green-600">
                            <Globe className="w-3 h-3" />
                            <span>Publik</span>
                          </div>
                          {renderCategoryBadge(quiz.category)}
                          {renderLanguageBadge(quiz.language)}
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-gray-500">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => router.push(`/host/${quiz.id}`)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white shadow-md"
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
                            className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 shadow-md"
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
                            Kuis belum memiliki pertanyaan
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
              {loadingMyQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      className="animate-pulse bg-white/90 border-none shadow-md"
                    >
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
                      {searchTerm
                        ? "Tidak ada kuis yang cocok"
                        : "Belum ada kuis"}
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      {searchTerm
                        ? "Coba kata kunci lain"
                        : "Buat kuis pertama Anda untuk memulai!"}
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
                          <CardDescription className="line-clamp-2 text-gray-600">
                            {quiz.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Badge
                            variant="secondary"
                            className="bg-gray-200 text-gray-700"
                          >
                            {quiz.questions?.length || 0} pertanyaan
                          </Badge>
                          <Badge
                            variant={quiz.is_public ? "default" : "outline"}
                            className={`text-xs ${
                              quiz.is_public
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {quiz.is_public ? "Publik" : "Privat"}
                          </Badge>
                          {renderCategoryBadge(quiz.category)}
                          {renderLanguageBadge(quiz.language)}
                        </div>
                        <div className="flex justify-between items-center mb-4">
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
            <TabsContent value="history" className="space-y-6">
              {loadingGameHistory ? (
                <p className="text-center text-gray-500">
                  Memuat riwayat permainan...
                </p>
              ) : gameHistory.length === 0 ? (
                <Card className="bg-white/90 border-none shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Belum ada riwayat permainan
                    </h3>
                    <p className="text-gray-600 text-center mb-4">
                      Anda belum mengikuti kuis apa pun.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-auto rounded-md shadow">
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                          Judul Kuis
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                          Skor
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gameHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 text-sm text-gray-800">
                            {entry.game_sessions.quizzes.title ||
                              "Judul tidak ditemukan"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(entry.joined_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {entry.score} poin
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/results/${entry.session_id}?participant=${entry.id}`
                                )
                              }
                            >
                              Lihat Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Bottom Navigation Menu */}
      {typeof window !== "undefined" && (
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
                  <h3 className="font-medium text-lg mb-4 px-2 text-gray-900">
                    Menu Navigasi
                  </h3>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    {navigationLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsNavOpen(false)}
                      >
                        <Button
                          variant={
                            link.href === "/dashboard" ? "default" : "ghost"
                          }
                          className="w-full justify-start text-lg py-6"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={
                                link.href === "/dashboard"
                                  ? "text-white"
                                  : "text-gray-700"
                              }
                            >
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
