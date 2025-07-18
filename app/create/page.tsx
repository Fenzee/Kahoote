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
import { ArrowLeft, Slack, Globe, Lock, Info, Plus, Trash2, Brain } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

const categories = [
  { value: "general", label: "Umum" },
  { value: "science", label: "Sains" },
  { value: "math", label: "Matematika" },
  { value: "history", label: "Sejarah" },
  { value: "geography", label: "Geografi" },
  { value: "language", label: "Bahasa" },
  { value: "technology", label: "Teknologi" },
  { value: "sports", label: "Olahraga" },
  { value: "entertainment", label: "Hiburan" },
  { value: "business", label: "Bisnis" },
];

const languages = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "Inggris" },
];

type Question = {
  id: string;
  question_text: string;
  time_limit: number;
  points: number;
  answers: Answer[];
};

type Answer = {
  id: string;
  answer_text: string;
  is_correct: boolean;
  color: string;
};

const defaultQuestion: Question = {
  id: crypto.randomUUID(),
  question_text: "",
  time_limit: 20,
  points: 10,
  answers: [
    { id: crypto.randomUUID(), answer_text: "", is_correct: true, color: "#e74c3c" },
    { id: crypto.randomUUID(), answer_text: "", is_correct: false, color: "#3498db" },
    { id: crypto.randomUUID(), answer_text: "", is_correct: false, color: "#2ecc71" },
    { id: crypto.randomUUID(), answer_text: "", is_correct: false, color: "#f1c40f" },
  ],
};

const defaultColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"];

export default function CreateQuizPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_public: false,
    category: "general",
    language: "id",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOptions, setAiOptions] = useState({
    generateMetadata: true,
    questionCount: 5,
    randomizeCorrectAnswer: true,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Insert the quiz first
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: formData.title,
          description: formData.description || null,
          creator_id: user.id,
          is_public: formData.is_public,
          category: formData.category,
          language: formData.language,
        })
        .select()
        .single();
      
      if (quizError) throw quizError;
      
      // If we have questions, insert them
      if (questions.length > 0) {
        // Insert questions
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const { data: questionData, error: questionError } = await supabase
            .from("questions")
            .insert({
              quiz_id: quizData.id,
              question_text: question.question_text,
              time_limit: question.time_limit,
              points: question.points,
              order_index: i,
            })
            .select()
            .single();
          
          if (questionError) throw questionError;
          
          // Insert answers for this question
          const answersToInsert = question.answers.map((answer, index) => ({
            question_id: questionData.id,
            answer_text: answer.answer_text,
            is_correct: answer.is_correct,
            color: answer.color,
            order_index: index,
          }));
          
          const { error: answersError } = await supabase
            .from("answers")
            .insert(answersToInsert);
          
          if (answersError) throw answersError;
        }
      }
      
      router.push(`/dashboard`);
      toast({
        title: "Berhasil",
        description: "Quiz berhasil dibuat",
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Gagal",
        description: "Gagal membuat quiz. Silakan coba lagi.",
        variant: "destructive",
      });
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

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...defaultQuestion, id: crypto.randomUUID() }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: string | number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateAnswer = (questionId: string, answerId: string, field: string, value: string | boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === answerId ? { ...a, [field]: value } : a
              ),
            }
          : q
      )
    );
  };

  const addAnswer = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: [
                ...q.answers,
                {
                  id: crypto.randomUUID(),
                  answer_text: "",
                  is_correct: false,
                  color: defaultColors[q.answers.length % defaultColors.length],
                },
              ],
            }
          : q
      )
    );
  };

  const removeAnswer = (questionId: string, answerId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.filter((a) => a.id !== answerId),
            }
          : q
      )
    );
  };

  const generateQuestionsWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setAiGenerating(true);
    try {
      // Panggil API untuk menghasilkan pertanyaan dengan Cohere
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          language: formData.language,
          count: aiOptions.questionCount,
          generateMetadata: aiOptions.generateMetadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghasilkan pertanyaan");
      }

      const data = await response.json();
      
      // Terapkan metadata jika dihasilkan
      if (data.metadata && aiOptions.generateMetadata) {
        setFormData(prev => ({
          ...prev,
          title: data.metadata.title || prev.title,
          description: data.metadata.description || prev.description,
          category: data.metadata.category || prev.category,
          language: data.metadata.language || prev.language,
        }));
      }
      
      // Transform hasil dari API ke format yang dibutuhkan
      const generatedQuestions = data.questions.map((q: any) => {
        // Shuffle answers if randomizeCorrectAnswer is true
        let answers = [...q.answers];
        if (aiOptions.randomizeCorrectAnswer) {
          // Mengacak urutan jawaban
          answers = answers.sort(() => Math.random() - 0.5);
        }
        
        return {
          id: crypto.randomUUID(),
          question_text: q.question_text,
          time_limit: 20,
          points: 1000,
          answers: answers.map((a: any, index: number) => ({
            id: crypto.randomUUID(),
            answer_text: a.answer_text,
            is_correct: a.is_correct,
            color: defaultColors[index % defaultColors.length],
          })),
        };
      });
      
      setQuestions((prev) => [...prev, ...generatedQuestions]);
      
      if (aiOptions.generateMetadata) {
        setActiveTab("questions");
      }
      
      setAiPrompt("");
      toast({
        title: "Berhasil",
        description: `${generatedQuestions.length} pertanyaan telah dihasilkan`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Gagal menghasilkan pertanyaan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-blue-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <Slack className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Buat Quiz Baru</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="info" className="text-base py-3">
                Informasi Quiz
              </TabsTrigger>
              <TabsTrigger value="questions" className="text-base py-3">
                Pertanyaan {questions.length > 0 && `(${questions.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="shadow-lg border-blue-200 mb-6">
                <CardHeader className="bg-purple-50/50 border-b border-purple-100 rounded-t-lg">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-purple-800">Buat dengan AI</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-prompt" className="text-gray-700 font-medium">
                        Jelaskan Quiz yang Ingin Dibuat
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="Contoh: Buat quiz tentang sejarah Indonesia dengan 5 pertanyaan pilihan ganda"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={3}
                        className="border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="options">
                        <AccordionTrigger className="text-sm text-purple-700">
                          Opsi Lanjutan
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <Label htmlFor="generate-metadata" className="text-sm text-gray-700">
                                  Hasilkan Metadata Quiz
                                </Label>
                                <p className="text-xs text-gray-500">
                                  AI akan membuat judul, deskripsi, dan memilih kategori yang sesuai
                                </p>
                              </div>
                              <Switch
                                id="generate-metadata"
                                checked={aiOptions.generateMetadata}
                                onCheckedChange={(checked) =>
                                  setAiOptions((prev) => ({ ...prev, generateMetadata: checked }))
                                }
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="question-count" className="text-sm text-gray-700">
                                  Jumlah Pertanyaan
                                </Label>
                                <span className="text-sm font-medium text-purple-700">
                                  {aiOptions.questionCount}
                                </span>
                              </div>
                              <Slider
                                id="question-count"
                                min={1}
                                max={10}
                                step={1}
                                value={[aiOptions.questionCount]}
                                onValueChange={(value) =>
                                  setAiOptions((prev) => ({ ...prev, questionCount: value[0] }))
                                }
                                className="py-4"
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <Label htmlFor="randomize-answers" className="text-sm text-gray-700">
                                  Acak Posisi Jawaban Benar
                                </Label>
                                <p className="text-xs text-gray-500">
                                  Posisi jawaban benar akan diacak dan tidak selalu di opsi pertama
                                </p>
                              </div>
                              <Switch
                                id="randomize-answers"
                                checked={aiOptions.randomizeCorrectAnswer}
                                onCheckedChange={(checked) =>
                                  setAiOptions((prev) => ({ ...prev, randomizeCorrectAnswer: checked }))
                                }
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={generateQuestionsWithAI}
                        disabled={aiGenerating || !aiPrompt.trim()}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                      >
                        {aiGenerating ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menghasilkan...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Brain className="w-4 h-4 mr-2" />
                            Hasilkan Quiz dengan AI
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg border-blue-200">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 rounded-t-lg">
                  <CardTitle className="text-blue-800">Informasi Quiz</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-gray-700 font-medium">
                        Judul Quiz *
                      </Label>
                      <Input
                        id="title"
                        placeholder="Masukkan judul quiz..."
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        required
                        className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-700 font-medium">
                        Deskripsi (Opsional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Jelaskan tentang quiz ini..."
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                        className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Category & Language */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-gray-700 font-medium">
                          Kategori
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleInputChange("category", value)}
                        >
                          <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language" className="text-gray-700 font-medium">
                          Bahasa
                        </Label>
                        <Select
                          value={formData.language}
                          onValueChange={(value) => handleInputChange("language", value)}
                        >
                          <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Pilih bahasa" />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((language) => (
                              <SelectItem key={language.value} value={language.value}>
                                {language.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Public Toggle */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="is_public" className="text-base font-medium text-gray-800">
                            Public Quizz
                          </Label>
                          <p className="text-sm text-gray-600">Izinkan pengguna lain untuk menghost quiz ini</p>
                        </div>
                        <Switch
                          id="is_public"
                          checked={formData.is_public}
                          onCheckedChange={(checked) => handleInputChange("is_public", checked)}
                          className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-300"
                        />
                      </div>

                      {/* Public/Private Info */}
                      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {formData.is_public ? (
                                <>
                                  <Globe className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium text-purple-800">Public Quizz</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-blue-800">Quiz Private</span>
                                </>
                              )}
                            </div>
                            <ul className="text-sm space-y-1 ml-6 text-gray-700">
                              {formData.is_public ? (
                                <>
                                  <li>• Muncul di halaman "Jelajah Quiz" untuk semua pengguna</li>
                                  <li>• Pengguna lain dapat menghost quiz ini</li>
                                  <li>• Tetap dapat diedit hanya oleh Anda</li>
                                </>
                              ) : (
                                <>
                                  <li>• Hanya Anda yang dapat melihat dan menghost quiz ini</li>
                                  <li>• Tidak muncul di halaman "Jelajah Quiz"</li>
                                  <li>• Dapat diubah menjadi public kapan saja</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>

                    {/* Next Button */}
                    <div className="flex justify-end space-x-4">
                      <Link href="/dashboard">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                        >
                          Batal
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        disabled={!formData.title.trim()}
                        onClick={() => setActiveTab("questions")}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions">
              <Card className="shadow-lg border-blue-200">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-800">Pertanyaan Quiz</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        onClick={addQuestion}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Tambah Manual
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Questions List */}
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-8">
                      {questions.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-gray-500">
                            Belum ada pertanyaan. Tambahkan pertanyaan secara manual atau gunakan AI di tab "Informasi Quiz".
                          </p>
                        </div>
                      ) : (
                        questions.map((question, qIndex) => (
                          <div
                            key={question.id}
                            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-medium text-gray-800">
                                Pertanyaan {qIndex + 1}
                              </h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-4">
                              {/* Question Text */}
                              <div>
                                <Label htmlFor={`q-${question.id}`} className="text-sm text-gray-600">
                                  Teks Pertanyaan
                                </Label>
                                <Textarea
                                  id={`q-${question.id}`}
                                  value={question.question_text}
                                  onChange={(e) =>
                                    updateQuestion(question.id, "question_text", e.target.value)
                                  }
                                  placeholder="Masukkan pertanyaan..."
                                  className="mt-1"
                                />
                              </div>

                              {/* Time & Points */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`time-${question.id}`} className="text-sm text-gray-600">
                                    Waktu (hanya berlaku untuk mode solo) 
                                  </Label>
                                  <Input
                                    id={`time-${question.id}`}
                                    type="number"
                                    min="5"
                                    max="120"
                                    value={question.time_limit}
                                    onChange={(e) =>
                                      updateQuestion(
                                        question.id,
                                        "time_limit",
                                        parseInt(e.target.value) || 20
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`points-${question.id}`} className="text-sm text-gray-600">
                                    Poin
                                  </Label>
                                  <Input
                                    id={`points-${question.id}`}
                                    type="number"
                                    min="1"
                                    step="10"
                                    value={question.points}
                                    onChange={(e) =>
                                      updateQuestion(
                                        question.id,
                                        "points",
                                        parseInt(e.target.value) || 10
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              </div>

                              <Separator />

                              {/* Answers */}
                              <div className="space-y-3">
                                <Label className="text-sm text-gray-600">Jawaban</Label>
                                {question.answers.map((answer, aIndex) => (
                                  <div
                                    key={answer.id}
                                    className="flex items-center space-x-3"
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full shrink-0"
                                      style={{ backgroundColor: answer.color }}
                                    ></div>
                                    <Input
                                      value={answer.answer_text}
                                      onChange={(e) =>
                                        updateAnswer(
                                          question.id,
                                          answer.id,
                                          "answer_text",
                                          e.target.value
                                        )
                                      }
                                      placeholder={`Jawaban ${aIndex + 1}`}
                                      className="flex-1"
                                    />
                                    <div className="flex items-center space-x-2">
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="radio"
                                          id={`correct-${answer.id}`}
                                          name={`correct-${question.id}`}
                                          checked={answer.is_correct}
                                          aria-label={`Tandai jawaban ${aIndex + 1} sebagai benar`}
                                          onChange={() => {
                                            // Set all answers to false first
                                            question.answers.forEach((a) => {
                                              if (a.id !== answer.id) {
                                                updateAnswer(
                                                  question.id,
                                                  a.id,
                                                  "is_correct",
                                                  false
                                                );
                                              }
                                            });
                                            // Then set this one to true
                                            updateAnswer(
                                              question.id,
                                              answer.id,
                                              "is_correct",
                                              true
                                            );
                                          }}
                                          className="text-blue-600"
                                        />
                                        <Label
                                          htmlFor={`correct-${answer.id}`}
                                          className="text-xs text-gray-600"
                                        >
                                          Benar
                                        </Label>
                                      </div>
                                      {question.answers.length > 2 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAnswer(question.id, answer.id)}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {question.answers.length < 6 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addAnswer(question.id)}
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50 mt-2"
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> Tambah Jawaban
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Submit Button */}
                  <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("info")}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                    >
                      Kembali
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !formData.title.trim()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"
                    >
                      {loading ? "Membuat..." : "Buat Quiz"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
