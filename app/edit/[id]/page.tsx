"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Plus, Trash2, Clock, Trophy } from "lucide-react"
import Link from "next/link"

interface Answer {
  id: string
  text: string
  isCorrect: boolean
  color: string
}

interface Question {
  id: string
  text: string
  timeLimit: number
  points: number
  answers: Answer[]
}

interface Quiz {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

const answerColors = [
  "#e74c3c", // Red
  "#3498db", // Blue
  "#f39c12", // Orange
  "#2ecc71", // Green
]

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    if (user) {
      fetchQuiz()
    }
  }, [user, resolvedParams.id])

  // Add this useEffect right after the existing useEffect
  useEffect(() => {
    // Redirect to home if not authenticated
    if (!user) {
      router.push("/")
    }
  }, [user, router])

  const fetchQuiz = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          description,
          questions (
            id,
            question_text,
            time_limit,
            points,
            order_index,
            answers (
              id,
              answer_text,
              is_correct,
              color,
              order_index
            )
          )
        `)
        .eq("id", resolvedParams.id)
        .eq("creator_id", user?.id)
        .single()

      if (quizError) throw quizError

      // Transform data
      const transformedQuiz: Quiz = {
        id: quizData.id,
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions
          .sort((a, b) => a.order_index - b.order_index)
          .map((q) => ({
            id: q.id,
            text: q.question_text,
            timeLimit: q.time_limit,
            points: q.points,
            answers: q.answers
              .sort((a, b) => a.order_index - b.order_index)
              .map((a) => ({
                id: a.id,
                text: a.answer_text,
                isCorrect: a.is_correct,
                color: a.color,
              })),
          })),
      }

      setQuiz(transformedQuiz)
    } catch (error) {
      console.error("Error fetching quiz:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const updateQuiz = (field: string, value: any) => {
    if (!quiz) return
    setQuiz({ ...quiz, [field]: value })
  }

  const updateQuestion = (questionId: string, field: string, value: any) => {
    if (!quiz) return
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)),
    })
  }

  const updateAnswer = (questionId: string, answerId: string, field: string, value: any) => {
    if (!quiz) return
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) => (a.id === answerId ? { ...a, [field]: value } : a)),
            }
          : q,
      ),
    })
  }

  const setCorrectAnswer = (questionId: string, answerId: string) => {
    if (!quiz) return
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((a) => ({ ...a, isCorrect: a.id === answerId })),
            }
          : q,
      ),
    })
  }

  const addQuestion = () => {
    if (!quiz) return

    const newQuestion: Question = {
      id: `new_${Date.now()}`,
      text: "",
      timeLimit: 20,
      points: 1000,
      answers: [
        { id: `new_${Date.now()}_1`, text: "", isCorrect: false, color: answerColors[0] },
        { id: `new_${Date.now()}_2`, text: "", isCorrect: false, color: answerColors[1] },
        { id: `new_${Date.now()}_3`, text: "", isCorrect: false, color: answerColors[2] },
        { id: `new_${Date.now()}_4`, text: "", isCorrect: false, color: answerColors[3] },
      ],
    }

    setQuiz({
      ...quiz,
      questions: [...quiz.questions, newQuestion],
    })
  }

  const removeQuestion = async (questionId: string) => {
    if (!quiz || quiz.questions.length <= 1) return

    // If it's an existing question, delete from database
    if (!questionId.startsWith("new_")) {
      try {
        const { error } = await supabase.from("questions").delete().eq("id", questionId)

        if (error) throw error
      } catch (error) {
        console.error("Error deleting question:", error)
        return
      }
    }

    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((q) => q.id !== questionId),
    })
  }

  const saveQuiz = async () => {
    if (!quiz || !user) return

    setSaving(true)
    try {
      // Update quiz basic info
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({
          title: quiz.title,
          description: quiz.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quiz.id)

      if (quizError) throw quizError

      // Handle questions
      for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i]

        if (question.id.startsWith("new_")) {
          // Create new question
          const { data: questionData, error: questionError } = await supabase
            .from("questions")
            .insert({
              quiz_id: quiz.id,
              question_text: question.text,
              time_limit: question.timeLimit,
              points: question.points,
              order_index: i,
            })
            .select()
            .single()

          if (questionError) throw questionError

          // Create answers for new question
          const answersToInsert = question.answers.map((answer, index) => ({
            question_id: questionData.id,
            answer_text: answer.text,
            is_correct: answer.isCorrect,
            color: answer.color,
            order_index: index,
          }))

          const { error: answersError } = await supabase.from("answers").insert(answersToInsert)

          if (answersError) throw answersError
        } else {
          // Update existing question
          const { error: questionError } = await supabase
            .from("questions")
            .update({
              question_text: question.text,
              time_limit: question.timeLimit,
              points: question.points,
              order_index: i,
            })
            .eq("id", question.id)

          if (questionError) throw questionError

          // Update answers
          for (let j = 0; j < question.answers.length; j++) {
            const answer = question.answers[j]
            const { error: answerError } = await supabase
              .from("answers")
              .update({
                answer_text: answer.text,
                is_correct: answer.isCorrect,
                color: answer.color,
                order_index: j,
              })
              .eq("id", answer.id)

            if (answerError) throw answerError
          }
        }
      }

      router.push("/dashboard")
    } catch (error) {
console.error("Error saving quiz:", JSON.stringify(error))
      alert("Gagal menyimpan quiz. Silakan coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Memuat quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz tidak ditemukan</h2>
          <p className="text-gray-600 mb-4">Quiz yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
          <Link href="/dashboard">
            <Button>Kembali ke Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
            </div>
            <Button
              onClick={saveQuiz}
              disabled={saving || !quiz.title.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quiz Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Informasi Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Judul Quiz *</Label>
              <Input
                id="title"
                value={quiz.title}
                onChange={(e) => updateQuiz("title", e.target.value)}
                placeholder="Masukkan judul quiz..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={quiz.description || ""}
                onChange={(e) => updateQuiz("description", e.target.value)}
                placeholder="Deskripsi singkat tentang quiz ini..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {quiz.questions.map((question, questionIndex) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pertanyaan {questionIndex + 1}</CardTitle>
                  {quiz.questions.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Text */}
                <div>
                  <Label>Pertanyaan *</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, "text", e.target.value)}
                    placeholder="Tulis pertanyaan Anda di sini..."
                    className="mt-1 text-lg"
                    rows={3}
                  />
                </div>

                {/* Question Settings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Batas Waktu (detik)
                    </Label>
                    <Input
                      type="number"
                      value={question.timeLimit}
                      onChange={(e) => updateQuestion(question.id, "timeLimit", Number.parseInt(e.target.value))}
                      min={5}
                      max={120}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      <Trophy className="w-4 h-4 mr-2" />
                      Poin
                    </Label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(question.id, "points", Number.parseInt(e.target.value))}
                      min={100}
                      max={2000}
                      step={100}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Answers */}
                <div>
                  <Label className="mb-4 block">Pilihan Jawaban</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {question.answers.map((answer, answerIndex) => (
                      <div
                        key={answer.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          answer.isCorrect ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setCorrectAnswer(question.id, answer.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: answer.color }} />
                          <div className="flex-1">
                            <Input
                              value={answer.text}
                              onChange={(e) => updateAnswer(question.id, answer.id, "text", e.target.value)}
                              placeholder={`Pilihan ${answerIndex + 1}`}
                              className="border-none p-0 focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {answer.isCorrect && <div className="text-green-600 font-semibold text-sm">✓ Benar</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Klik pada pilihan untuk menandai sebagai jawaban yang benar
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Question Button */}
          <div className="text-center">
            <Button
              onClick={addQuestion}
              variant="outline"
              className="border-dashed border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600 bg-transparent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pertanyaan
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
