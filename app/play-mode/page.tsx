"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Globe,
  GameController,
  ArrowRight,
  Hash,
  Search,
  Star,
  Clock,
  Play,
  Gamepad2,
  Heart,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PlayModePage() {
  const router = useRouter();
  const [gamePin, setGamePin] = useState("");

  const handlePrivateQuizJoin = () => {
    if (gamePin.trim()) {
      router.push(`/join?pin=${gamePin}`);
    }
  };

  const handlePublicQuizBrowse = () => {
    router.push("/play-mode/browse");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            GolekQuiz
          </span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pilih Mode{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Permainan
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Bermain quiz private dari teman atau jelajahi koleksi quiz publik yang tersedia
            </p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Private Quiz Mode */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 hover:shadow-3xl transition-all duration-300 group">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Quiz dari Teman
                </CardTitle>
                <p className="text-gray-600">
                  Bergabung dengan game quiz yang dibuat temanmu menggunakan PIN
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Masukkan PIN Game"
                      value={gamePin}
                      onChange={(e) => setGamePin(e.target.value.toUpperCase())}
                      className="pl-10 py-3 text-lg text-center tracking-widest font-mono border-2 focus:border-blue-500"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handlePrivateQuizJoin}
                    disabled={!gamePin.trim()}
                    className="w-full py-3 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Bergabung Game
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Keunggulan:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <Heart className="w-4 h-4 text-red-500 mr-2" />
                      Bermain dengan teman dan keluarga
                    </li>
                    <li className="flex items-center">
                      <GameController className="w-4 h-4 text-blue-500 mr-2" />
                      Quiz khusus yang dibuat teman
                    </li>
                    <li className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      Real-time multiplayer experience
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Public Quiz Mode */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="h-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 hover:shadow-3xl transition-all duration-300 group">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Quiz Publik
                </CardTitle>
                <p className="text-gray-600">
                  Jelajahi dan mainkan koleksi quiz publik dari berbagai kategori
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={handlePublicQuizBrowse}
                  className="w-full py-3 text-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Jelajahi Quiz Publik
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Keunggulan:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <BookOpen className="w-4 h-4 text-green-500 mr-2" />
                      Ribuan quiz dari berbagai topik
                    </li>
                    <li className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      Rating dan review dari pemain lain
                    </li>
                    <li className="flex items-center">
                      <Clock className="w-4 h-4 text-blue-500 mr-2" />
                      Latihan mandiri tanpa batas waktu
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-purple-800 mb-2">Kategori Populer:</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Umum
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Sains
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Sejarah
                    </Badge>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Olahraga
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">1000+</div>
              <div className="text-gray-600">Quiz Tersedia</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">50K+</div>
              <div className="text-gray-600">Pemain Aktif</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">10+</div>
              <div className="text-gray-600">Kategori Quiz</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}