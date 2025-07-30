"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Star,
  Clock,
  Users,
  Play,
  Gamepad2,
  Filter,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Trophy,
  ChevronDown,
  Heart,
  BookOpen,
  MapPin,
  Music,
  Cpu,
  Atom,
  HelpCircle,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuizCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PublicQuiz {
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

export default function BrowsePublicQuizPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [bookmarkedQuizzes, setBookmarkedQuizzes] = useState<Set<string>>(new Set());

  // Icon mapping untuk kategori
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      HelpCircle,
      Atom,
      Clock,
      Trophy,
      Cpu,
      BookOpen,
      MapPin,
      Music,
      Heart,
      MoreHorizontal,
    };
    return iconMap[iconName] || HelpCircle;
  };

  useEffect(() => {
    loadCategories();
    loadQuizzes();
    loadBookmarks();
  }, [selectedCategory, selectedDifficulty, sortBy, searchTerm]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadQuizzes = async () => {
    try {
      let query = supabase.from("public_quiz_browse").select("*");

      // Filter by category
      if (selectedCategory !== "all") {
        query = query.eq("category_name", selectedCategory);
      }

      // Filter by difficulty
      if (selectedDifficulty !== "all") {
        query = query.eq("difficulty_level", selectedDifficulty);
      }

      // Search filter
      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,creator_username.ilike.%${searchTerm}%`
        );
      }

      // Sort by
      switch (sortBy) {
        case "popular":
          query = query.order("play_count", { ascending: false });
          break;
        case "rating":
          query = query.order("rating_average", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error("Error loading quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quiz_bookmarks")
        .select("quiz_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const bookmarkedIds = new Set(data?.map((b) => b.quiz_id) || []);
      setBookmarkedQuizzes(bookmarkedIds);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
  };

  const toggleBookmark = async (quizId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (bookmarkedQuizzes.has(quizId)) {
        // Remove bookmark
        await supabase
          .from("quiz_bookmarks")
          .delete()
          .eq("quiz_id", quizId)
          .eq("user_id", user.id);

        setBookmarkedQuizzes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(quizId);
          return newSet;
        });
      } else {
        // Add bookmark
        await supabase
          .from("quiz_bookmarks")
          .insert({ quiz_id: quizId, user_id: user.id });

        setBookmarkedQuizzes((prev) => new Set([...prev, quizId]));
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const playQuiz = async (quizId: string) => {
    try {
      // Increment play count
      await supabase.rpc("increment_play_count", { quiz_id_param: quizId });

      // Navigate to host page with public quiz mode
      router.push(`/host/public/${quizId}`);
    } catch (error) {
      console.error("Error starting quiz:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/play-mode" className="flex items-center space-x-2">
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
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Jelajahi{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quiz Publik
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Temukan dan mainkan quiz dari berbagai kategori dan tingkat kesulitan
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari quiz..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Difficulty Filter */}
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat</SelectItem>
                  <SelectItem value="easy">Mudah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="hard">Sulit</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Paling Populer</SelectItem>
                  <SelectItem value="rating">Rating Tertinggi</SelectItem>
                  <SelectItem value="newest">Terbaru</SelectItem>
                  <SelectItem value="oldest">Terlama</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat quiz...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz, index) => {
              const IconComponent = getIconComponent(quiz.category_icon);
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-white/95 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: quiz.category_color + "20" }}
                          >
                            <IconComponent
                              className="w-6 h-6"
                              style={{ color: quiz.category_color }}
                            />
                          </div>
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {quiz.category_name}
                            </Badge>
                            <CardTitle className="text-lg leading-tight">
                              {quiz.title}
                            </CardTitle>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBookmark(quiz.id)}
                          className="shrink-0"
                        >
                          {bookmarkedQuizzes.has(quiz.id) ? (
                            <BookmarkCheck className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Bookmark className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {quiz.description}
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>By {quiz.creator_username}</span>
                        <Badge
                          variant="secondary"
                          className={getDifficultyColor(quiz.difficulty_level)}
                        >
                          {getDifficultyText(quiz.difficulty_level)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>{quiz.estimated_duration} menit</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-green-500" />
                          <span>{quiz.question_count} soal</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span>{quiz.play_count} bermain</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>
                            {quiz.rating_average.toFixed(1)} ({quiz.rating_count})
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => playQuiz(quiz.id)}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Main Quiz
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tidak ada quiz ditemukan
            </h3>
            <p className="text-gray-600">
              Coba ubah filter pencarian atau kata kunci Anda
            </p>
          </div>
        )}
      </main>
    </div>
  );
}