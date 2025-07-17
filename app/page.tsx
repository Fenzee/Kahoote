"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Slack,
  Play,
  Users,
  Trophy,
  ArrowRight,
  CheckCircle,
  Gamepad2,
  User,
  Settings,
  LogOut,
  Plus,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface RecentQuiz {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
  created_at: string;
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      fetchRecentQuizzes();
    }
  }, [user]);
  useEffect(() => {
    const fetchUsername = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Failed to fetch username:", error.message);
          setUsername(user.email?.split("@")[0] ?? "User");
        } else {
          setUsername(data?.username ?? user.email?.split("@")[0] ?? "User");
        }
      }
    };

    fetchUsername();
  }, []);

  const fetchRecentQuizzes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          `
          id,
          title,
          description,
          created_at,
          questions (count)
        `
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching recent quizzes:", error);
        return;
      }

      const formattedQuizzes: RecentQuiz[] = (data || []).map((quiz: any) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        question_count: quiz.questions?.[0]?.count || 0,
        created_at: quiz.created_at,
      }));

      setRecentQuizzes(formattedQuizzes);
    } catch (error) {
      console.error("Error fetching recent quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getUserInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE]">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <Slack className="w-6 h-6 text-cyan-950" />
              </div>
              <span className="text-2xl font-bold text-white">MyLessons</span>
            </Link>

            <nav className="flex items-center space-x-1 md:space-x-6">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button
                      variant="ghost"
                      className="text-white h-10 w-10 md:w-auto md:h-auto hover:bg-white md:hover:bg-white/20 rounded-full md:rounded-xl"
                    >
                      <BarChart3 className="w-5 h-5 md:mr-2" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Button>
                  </Link>
                  <Link href="/create">
                    <Button
                      variant="ghost"
                      className="text-white h-10 w-10 md:w-auto md:h-auto hover:bg-white md:hover:bg-white/20 rounded-full md:rounded-xl"
                    >
                      <Plus className="w-5 h-5 md:mr-2" />
                      <span className="hidden md:inline">Buat Quiz</span>
                    </Button>
                  </Link>
                  <Link href="/join">
                    <Button
                      variant="ghost"
                      className="text-white h-10 w-10 md:w-auto md:h-auto hover:bg-white md:hover:bg-white/20 rounded-full md:rounded-xl"
                    >
                      <Gamepad2 className="w-5 h-5 *: md:mr-2" />
                      <span className="hidden md:inline">Join Game</span>
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full "
                      >
                        <Avatar className="h-10 w-10">
                          {/* <AvatarImage
                            src="/placeholder.svg"
                            alt={user.email || ""}
                          /> */}
                          <AvatarImage
                            src={`https://robohash.org/${encodeURIComponent(
                              user.email || "guest"
                            )}.png`}
                            alt={user.email || ""}
                          />
                          <AvatarFallback className="bg-white text-purple-600 text-sm font-semibold">
                            {getUserInitials(user.email || "")}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            Account
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                    >
                      <Gamepad2 className="w-4 h-4 mr-1" />
                      Join Game
                    </Button>
                  </Link> */}
                  <Link href="/auth/login">
                    <Button
                      variant="outline"
                      className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button className="bg-white text-purple-600 hover:bg-gray-100">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-12 pb-0">
        {user ? (
          /* Logged In User View */
          <div className="space-y-12">
            {/* Welcome Section */}
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-4">
                Welcome back,{" "}
                <span className="text-yellow-300">
                  {/* {user.email?.split("@")[0]} */}
                  {username ?? "Loading..."}
                </span>
                !
              </h1>
              <p className="text-xl text-white/80 mb-8">
                Ready to create amazing quizzes or join exciting games?
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/create">
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Quiz
                  </Button>
                </Link>
                <Link href="/join">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Join Game
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Quizzes */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Your Recent Quizzes
                </h2>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-white h-auto w-auto hover:bg-white md:hover:bg-white/20 rounded-xl"
                  >
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white/20 rounded-lg p-6 animate-pulse"
                    >
                      <div className="h-4 bg-white/30 rounded mb-2"></div>
                      <div className="h-3 bg-white/20 rounded mb-4"></div>
                      <div className="h-3 bg-white/20 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentQuizzes.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {recentQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="bg-white/20 border-white/30 hover:bg-white/30 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="text-white/70">
                          {quiz.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-white/80 text-sm mb-4">
                          <span>{quiz.question_count} questions</span>
                          <span>
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/edit/${quiz.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-white border-white/50 hover:bg-white hover:text-purple-600 bg-transparent"
                            >
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/host/${quiz.id}`} className="flex-1">
                            <Button
                              size="sm"
                              className="w-full bg-white text-purple-600 hover:bg-gray-100"
                            >
                              Host
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No quizzes yet
                  </h3>
                  <p className="text-white/70 mb-6">
                    Create your first quiz to get started!
                  </p>
                  <Link href="/create">
                    <Button className="bg-white text-purple-600 hover:bg-gray-100">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Quiz
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {/* <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-white/10 border-white/30 hover:bg-white/20 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Dashboard
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    View all your quizzes, analytics, and game history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard">
                    <Button className="w-full bg-white text-purple-600 hover:bg-gray-100">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/30 hover:bg-white/20 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Gamepad2 className="w-5 h-5 mr-2" />
                    Join Game
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Enter a game PIN to join an active quiz game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/join">
                    <Button
                      variant="outline"
                      className="w-full text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                    >
                      Join Game
                      <Play className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div> */}
          </div>
        ) : (
          /* Guest User View */
          <div className="space-y-5">
            {/* Hero Section */}
            <div className="text-center text-white">
              <h1 className="text-6xl font-bold mb-6">
                Create & Join Amazing{" "}
                <span className="text-yellow-300">Quiz Games</span>
              </h1>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Build interactive quizzes, host live games, and engage your
                audience with MyLessons - the ultimate quiz platform.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/join">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Join Game
                  </Button>
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 px-10">
              <Card className="bg-white/10 border-white/30 text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-white">Create Quizzes</CardTitle>
                  <CardDescription className="text-white/70">
                    Build engaging quizzes with multiple choice questions,
                    timers, and points
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/10 border-white/30 text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-teal-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-white">Host Live Games</CardTitle>
                  <CardDescription className="text-white/70">
                    Run interactive quiz sessions with real-time participation
                    and leaderboards
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-white/10 border-white/30 text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-white">Track Results</CardTitle>
                  <CardDescription className="text-white/70">
                    Analyze performance with detailed analytics and participant
                    insights
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* How It Works */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mx-10">
              <h2 className="text-2xl font-bold text-white text-center mb-8">
                How It Works
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-purple-600">1</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Create
                  </h3>
                  <p className="text-white/70">
                    Design your quiz with questions, answers, and settings
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-purple-600">
                      2
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Share
                  </h3>
                  <p className="text-white/70">
                    Share the game PIN with participants to join
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-purple-600">
                      3
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Play
                  </h3>
                  <p className="text-white/70">
                    Host live games and watch the excitement unfold
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-12 mx-10">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className=" text-white/80 mb-5">
                Join thousands of educators and trainers using MyLessons
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Sign Up Free
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-sm border-t border-white/10 mt-5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Slack className="w-5 h-5 text-cyan-950" />
              </div>
              <span className="text-lg font-bold text-white">MyLessons</span>
            </div>
            <p className="text-white/60 text-sm">
              © 2024 MyLessons. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
