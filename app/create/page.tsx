"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Slack, Globe, Lock, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreateQuizPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_public: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title: formData.title,
          description: formData.description || null,
          creator_id: user.id,
          is_public: formData.is_public,
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/edit/${data.id}`);
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Gagal membuat quiz. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Slack className="w-5 h-5 text-cyan-950" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Buat Quiz Baru
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Quiz *</Label>
                  <Input
                    id="title"
                    placeholder="Masukkan judul quiz..."
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi (Opsional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Jelaskan tentang quiz ini..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                {/* Public Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label
                        htmlFor="is_public"
                        className="text-base font-medium"
                      >
                        Public Quizz
                      </Label>
                      <p className="text-sm text-gray-600">
                        Izinkan pengguna lain untuk menghost quiz ini
                      </p>
                    </div>
                    <Switch
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) =>
                        handleInputChange("is_public", checked)
                      }
                    />
                  </div>

                  {/* Public/Private Info */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {formData.is_public ? (
                            <>
                              <Globe className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-800">
                                Public Quizz
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-orange-600" />
                              <span className="font-medium text-orange-800">
                                Quiz Private
                              </span>
                            </>
                          )}
                        </div>
                        <ul className="text-sm space-y-1 ml-6">
                          {formData.is_public ? (
                            <>
                              <li>
                                • Muncul di halaman "Jelajah Quiz" untuk semua
                                pengguna
                              </li>
                              <li>• Pengguna lain dapat menghost quiz ini</li>
                              <li>• Tetap dapat diedit hanya oleh Anda</li>
                            </>
                          ) : (
                            <>
                              <li>
                                • Hanya Anda yang dapat melihat dan menghost
                                quiz ini
                              </li>
                              <li>• Tidak muncul di halaman "Jelajah Quiz"</li>
                              <li>• Dapat diubah menjadi public kapan saja</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link href="/dashboard">
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={loading || !formData.title.trim()}
                  >
                    {loading ? "Membuat..." : "Buat Quiz"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Next Steps Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Langkah Selanjutnya</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Tambah Pertanyaan
                    </p>
                    <p>
                      Setelah quiz dibuat, Anda akan diarahkan ke halaman editor
                      untuk menambahkan pertanyaan.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Host Quiz</p>
                    <p>
                      Setelah menambahkan pertanyaan, Anda dapat menghost quiz
                      untuk dimainkan secara real-time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Bagikan</p>
                    <p>
                      Bagikan Game PIN kepada pemain atau buat Public Quizz agar
                      orang lain dapat menghost.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
