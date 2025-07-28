import { NextResponse } from "next/server";

// Tipe data untuk pertanyaan yang dihasilkan
type GeneratedQuestion = {
  question_text: string;
  answers: {
    answer_text: string;
    is_correct: boolean;
  }[];
};

// Tipe data untuk metadata quiz
type QuizMetadata = {
  title: string;
  description: string;
  category: string;
  language: string;
};

export async function POST(request: Request) {
  try {
    const { prompt, language, count = 5, generateMetadata = true } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Mendapatkan API key dari environment variable
    const apiKey = process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key Cohere tidak ditemukan" },
        { status: 500 }
      );
    }

    // Improved prompt structure for better context and language consistency
    const systemPrompt = language === 'id' 
      ? `Anda adalah pembuat quiz profesional yang ahli dalam membuat pertanyaan quiz yang spesifik dan kontekstual.

TUGAS: Buatkan ${count} pertanyaan quiz dengan 4 pilihan jawaban tentang: ${prompt}

ATURAN PENTING:
1. SELALU gunakan bahasa Indonesia
2. Pertanyaan harus SPESIFIK dan KONTEKSTUAL terhadap topik yang diminta
3. Jika topik menyebutkan nama perusahaan, organisasi, atau tempat tertentu, WAJIB menyebutkannya dalam pertanyaan
4. Hindari pertanyaan umum seperti "Apa nama lengkap perusahaan?" - sebutkan perusahaan spesifiknya
5. Jawaban harus faktual dan relevan dengan konteks yang diberikan

CONTOH YANG BENAR:
- Topik: "Perusahaan UBIG di Malang"
- Pertanyaan yang BAIK: "Apa bidang usaha utama perusahaan UBIG yang beroperasi di Malang?"
- Pertanyaan yang BURUK: "Apa nama lengkap perusahaan?" (terlalu umum)

${generateMetadata ? `Juga buatkan metadata quiz dengan judul yang menyebutkan topik spesifik, deskripsi yang relevan, dan kategori yang sesuai.` : ''}

Format jawaban harus dalam JSON dengan struktur berikut:
{
  ${generateMetadata ? `"metadata": {
    "title": "Quiz tentang [Topik Spesifik]",
    "description": "Quiz mengenai [deskripsi spesifik topik]",
    "category": "business",
    "language": "id"
  },` : ''}
  "questions": [
    {
      "question_text": "Pertanyaan spesifik yang menyebutkan subjek dengan jelas?",
      "answers": [
        { "answer_text": "Jawaban benar yang faktual", "is_correct": true },
        { "answer_text": "Jawaban salah yang masuk akal", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal", "is_correct": false }
      ]
    }
  ]
}

Pastikan:
- Hanya ada satu jawaban benar per pertanyaan
- Semua jawaban masuk akal dan relevan
- Pertanyaan menunjukkan konteks yang jelas
- Gunakan bahasa Indonesia yang baik dan benar
- Jangan tambahkan teks lain selain JSON`
      : `You are a professional quiz creator who specializes in making specific and contextual quiz questions.

TASK: Create ${count} quiz questions with 4 answer choices about: ${prompt}

IMPORTANT RULES:
1. ALWAYS use English language
2. Questions must be SPECIFIC and CONTEXTUAL to the requested topic
3. If the topic mentions specific company, organization, or place names, MUST mention them in the questions
4. Avoid generic questions like "What is the full name of the company?" - specify the actual company
5. Answers must be factual and relevant to the given context

GOOD EXAMPLE:
- Topic: "UBIG Company in Malang"
- GOOD Question: "What is the main business sector of UBIG company operating in Malang?"
- BAD Question: "What is the full name of the company?" (too generic)

${generateMetadata ? `Also create quiz metadata with a title that mentions the specific topic, relevant description, and appropriate category.` : ''}

Response format must be JSON with this structure:
{
  ${generateMetadata ? `"metadata": {
    "title": "Quiz about [Specific Topic]",
    "description": "Quiz regarding [specific topic description]",
    "category": "business",
    "language": "en"
  },` : ''}
  "questions": [
    {
      "question_text": "Specific question that clearly mentions the subject?",
      "answers": [
        { "answer_text": "Correct factual answer", "is_correct": true },
        { "answer_text": "Plausible wrong answer", "is_correct": false },
        { "answer_text": "Plausible wrong answer", "is_correct": false },
        { "answer_text": "Plausible wrong answer", "is_correct": false }
      ]
    }
  ]
}

Ensure:
- Only one correct answer per question
- All answers are plausible and relevant
- Questions show clear context
- Use proper English
- Don't add any text other than JSON`;

    // Panggil API Cohere
    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Cohere-Version": "2022-12-06",
      },
      body: JSON.stringify({
        model: "command",
        prompt: systemPrompt,
        max_tokens: 2000,
        temperature: 0.7,
        stop_sequences: [],
        return_likelihoods: "NONE",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error dari Cohere API:", data);
      return NextResponse.json(
        { error: "Gagal menghasilkan pertanyaan" },
        { status: response.status }
      );
    }

    // Ekstrak JSON dari respons
    const generatedText = data.generations[0].text.trim();
    
    // Coba parse JSON dari respons
    let parsedData: { metadata?: QuizMetadata, questions: GeneratedQuestion[] };
    try {
      // Cari teks JSON dalam respons (dimulai dengan { dan diakhiri dengan })
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Format JSON tidak valid");
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      console.error("Teks yang diterima:", generatedText);
      return NextResponse.json(
        { error: "Format respons tidak valid" },
        { status: 500 }
      );
    }

    // Validasi metadata jika diminta
    let metadata = undefined;
    if (generateMetadata && parsedData.metadata) {
      metadata = {
        title: parsedData.metadata.title || "",
        description: parsedData.metadata.description || "",
        category: parsedData.metadata.category || "general",
        language: parsedData.metadata.language || language,
      };
    }

    // Validasi struktur pertanyaan
    const questions = parsedData.questions || [];
    const validatedQuestions = questions
      .filter(q => 
        q.question_text && 
        Array.isArray(q.answers) && 
        q.answers.length >= 2 && 
        q.answers.some(a => a.is_correct)
      )
      .map(q => ({
        ...q,
        // Pastikan hanya ada satu jawaban benar
        answers: q.answers.slice(0, 4).map((a, i) => ({
          answer_text: a.answer_text,
          is_correct: i === q.answers.findIndex(ans => ans.is_correct),
        })),
      }));

    if (validatedQuestions.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada pertanyaan valid yang dihasilkan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      questions: validatedQuestions,
      metadata
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
} 