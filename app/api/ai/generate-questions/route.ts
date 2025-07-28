import { NextResponse } from "next/server";
import OpenAI from "openai";

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
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key OpenAI tidak ditemukan" },
        { status: 500 }
      );
    }

    // Inisialisasi OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Deteksi bahasa dari prompt user untuk konsistensi
    const isIndonesian = language === 'id' || /[ăâêôương]/.test(prompt) || 
                        /\b(di|ke|dari|yang|untuk|dengan|adalah|akan|pada|dalam|tentang|saya|anda|kita)\b/i.test(prompt);
    
    const targetLanguage = isIndonesian ? 'Indonesia' : 'Inggris';
    const languageCode = isIndonesian ? 'id' : 'en';

    // Improved system prompt dengan konteks yang lebih spesifik
    const systemPrompt = `Kamu adalah ahli pembuat kuis profesional yang sangat detail dan kontekstual. 

INSTRUKSI UTAMA:
1. Buat ${count} pertanyaan kuis dengan 4 pilihan jawaban tentang: "${prompt}"
2. WAJIB gunakan bahasa ${targetLanguage} secara konsisten
3. Pertanyaan harus SANGAT SPESIFIK dan DETAIL tentang topik yang diminta
4. Hindari pertanyaan umum seperti "What is the company?" - sebutkan nama spesifiknya
5. Berikan konteks yang jelas dalam setiap pertanyaan

PANDUAN KONTEKS SPESIFIK:
- Jika tentang perusahaan: sebutkan nama perusahaan, lokasi, bidang usaha
- Jika tentang tempat: sebutkan nama tempat, alamat, karakteristik khusus  
- Jika tentang produk: sebutkan nama produk, fitur, spesifikasi
- Jika tentang tokoh: sebutkan nama lengkap, jabatan, prestasi spesifik
- Jika tentang sejarah: sebutkan tahun, peristiwa, dampak spesifik

${generateMetadata ? `Buatkan juga metadata quiz dengan judul menarik yang mencakup nama/detail spesifik dari topik, deskripsi singkat, dan kategori yang sesuai.` : ''}

Format jawaban harus dalam JSON dengan struktur berikut:
{
  ${generateMetadata ? `"metadata": {
    "title": "Judul Quiz yang Spesifik dan Menarik",
    "description": "Deskripsi singkat tentang quiz ini",
    "category": "general",
    "language": "${languageCode}"
  },` : ''}
  "questions": [
    {
      "question_text": "Pertanyaan spesifik dan detail dengan konteks yang jelas?",
      "answers": [
        { "answer_text": "Jawaban benar yang spesifik", "is_correct": true },
        { "answer_text": "Jawaban salah yang masuk akal 1", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal 2", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal 3", "is_correct": false }
      ]
    }
  ]
}

CONTOH PERTANYAAN YANG BAIK (jika tentang "Perusahaan UBIG di Malang"):
❌ Buruk: "What is the full name of the company?"
✅ Baik: "Apa nama lengkap dari perusahaan UBIG yang berkantor pusat di Malang?"

❌ Buruk: "Where is the company located?"  
✅ Baik: "Di mana alamat kantor pusat perusahaan UBIG di Kota Malang?"

❌ Buruk: "What does the company do?"
✅ Baik: "Apa bidang usaha utama yang digeluti oleh perusahaan UBIG Malang?"

Kategori yang tersedia: general, science, math, history, geography, language, technology, sports, entertainment, business.

PENTING: 
- Gunakan bahasa ${targetLanguage} secara konsisten di seluruh pertanyaan dan jawaban
- Pastikan setiap pertanyaan menyebutkan konteks spesifik yang relevan
- Jawaban yang salah harus tetap masuk akal namun jelas berbeda dari jawaban benar
- Hanya berikan JSON yang diminta, tanpa teks tambahan`;

    // Panggil API OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Kamu adalah pembuat kuis profesional yang ahli dalam konteks spesifik. WAJIB gunakan bahasa ${targetLanguage} secara konsisten. Selalu berikan respons dalam format JSON yang valid dengan pertanyaan yang sangat spesifik dan kontekstual.`
        },
        {
          role: "user",
          content: systemPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.3, // Menurunkan temperature untuk konsistensi yang lebih baik
    });

    const generatedText = completion.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json(
        { error: "Tidak ada respons dari OpenAI" },
        { status: 500 }
      );
    }

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
        { error: "Format respons tidak valid dari AI. Silakan coba lagi dengan prompt yang lebih spesifik." },
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
        language: parsedData.metadata.language || languageCode,
      };
    }

    // Validasi struktur pertanyaan dengan pengecekan yang lebih ketat
    const questions = parsedData.questions || [];
    const validatedQuestions = questions
      .filter(q => {
        // Validasi lebih ketat untuk kualitas pertanyaan
        const hasValidQuestion = q.question_text && q.question_text.length > 10;
        const hasValidAnswers = Array.isArray(q.answers) && q.answers.length >= 2;
        const hasCorrectAnswer = q.answers.some(a => a.is_correct);
        const answersHaveContent = q.answers.every(a => a.answer_text && a.answer_text.length > 0);
        
        return hasValidQuestion && hasValidAnswers && hasCorrectAnswer && answersHaveContent;
      })
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
        { error: "Tidak ada pertanyaan valid yang dihasilkan. Silakan coba dengan prompt yang lebih detail dan spesifik." },
        { status: 500 }
      );
    }

    // Log untuk debugging (bisa dihapus di production)
    console.log(`Generated ${validatedQuestions.length} questions for prompt: "${prompt}" in ${targetLanguage}`);

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