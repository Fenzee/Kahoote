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

// Fungsi untuk mendeteksi dan memperkaya konteks
function enrichContext(prompt: string): { enhancedPrompt: string, contextType: string, specificInstructions: string } {
  const promptLower = prompt.toLowerCase();
  
  // Deteksi perusahaan Indonesia
  if (promptLower.includes('ubig') && promptLower.includes('malang')) {
    return {
      enhancedPrompt: `PT. UBIG (Unit Bisnis Indonesia Group) yang berlokasi di Malang, Jawa Timur`,
      contextType: 'indonesian_company',
      specificInstructions: `
- Gunakan informasi spesifik tentang PT. UBIG di Malang
- Fokus pada aspek bisnis, lokasi geografis, dan karakteristik perusahaan
- Buat pertanyaan yang menguji pengetahuan tentang perusahaan ini secara spesifik
- Hindari pertanyaan umum seperti "What is the full name of the company?"
- Contoh pertanyaan yang baik: "Di kota mana PT. UBIG berkantor pusat?", "Apa kepanjangan dari UBIG?", "PT. UBIG bergerak di bidang apa?"
      `
    };
  }
  
  // Deteksi perusahaan lainnya
  if (promptLower.includes('perusahaan') || promptLower.includes('company') || promptLower.includes('pt.') || promptLower.includes('cv.')) {
    return {
      enhancedPrompt: prompt,
      contextType: 'company',
      specificInstructions: `
- Buat pertanyaan yang spesifik tentang perusahaan yang disebutkan
- Fokus pada detail konkret seperti lokasi, bidang usaha, produk/layanan
- Hindari pertanyaan umum yang bisa berlaku untuk perusahaan manapun
- Gunakan nama perusahaan yang lengkap dalam pertanyaan dan jawaban
      `
    };
  }
  
  // Deteksi topik pendidikan
  if (promptLower.includes('sekolah') || promptLower.includes('universitas') || promptLower.includes('pendidikan')) {
    return {
      enhancedPrompt: prompt,
      contextType: 'education',
      specificInstructions: `
- Buat pertanyaan yang spesifik tentang institusi pendidikan yang disebutkan
- Fokus pada detail seperti lokasi, program studi, sejarah, fasilitas
- Gunakan nama institusi yang lengkap dan benar
      `
    };
  }
  
  // Deteksi topik geografis
  if (promptLower.includes('malang') || promptLower.includes('kota') || promptLower.includes('kabupaten')) {
    return {
      enhancedPrompt: prompt,
      contextType: 'geography',
      specificInstructions: `
- Buat pertanyaan yang spesifik tentang lokasi geografis yang disebutkan
- Fokus pada landmark, sejarah, budaya, ekonomi daerah tersebut
- Gunakan nama tempat yang tepat dan spesifik
      `
    };
  }
  
  return {
    enhancedPrompt: prompt,
    contextType: 'general',
    specificInstructions: `
- Buat pertanyaan yang spesifik dan relevan dengan topik yang disebutkan
- Hindari pertanyaan yang terlalu umum atau ambigu
- Pastikan setiap pertanyaan memiliki konteks yang jelas
    `
  };
}

export async function POST(request: Request) {
  try {
    const { prompt, language = 'id', count = 5, generateMetadata = true } = await request.json();

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

    // Enrich context untuk membuat pertanyaan lebih spesifik
    const { enhancedPrompt, contextType, specificInstructions } = enrichContext(prompt);

    // Format prompt yang diperbaiki untuk OpenAI
    const systemPrompt = `Kamu adalah pembuat quiz profesional yang ahli dalam membuat pertanyaan quiz yang menarik, spesifik, dan edukatif.

TOPIK: ${enhancedPrompt}
KONTEKS: ${contextType}
BAHASA: ${language === 'id' ? 'Indonesia' : 'Inggris'}

INSTRUKSI KHUSUS:${specificInstructions}

ATURAN WAJIB:
1. Setiap pertanyaan HARUS spesifik dan relevan dengan topik yang disebutkan
2. Gunakan nama lengkap dan detail yang tepat (jangan gunakan kata umum seperti "company", "perusahaan" tanpa nama)
3. Jawaban yang benar harus faktual dan dapat diverifikasi
4. Jawaban yang salah harus masuk akal tapi jelas-jelas salah
5. Gunakan bahasa ${language === 'id' ? 'Indonesia' : 'Inggris'} konsisten
6. Hindari pertanyaan yang terlalu mudah atau terlalu umum

CONTOH PERTANYAAN YANG BAIK untuk PT. UBIG Malang:
- "Di kota mana PT. UBIG berkantor pusat?"
- "Apa kepanjangan dari UBIG?"
- "PT. UBIG terletak di provinsi mana?"

CONTOH PERTANYAAN YANG BURUK (JANGAN DITIRU):
- "What is the full name of the company?" (terlalu umum)
- "Apa nama perusahaan?" (tidak spesifik)

Buatkan ${count} pertanyaan quiz dengan 4 pilihan jawaban.

${generateMetadata ? `Juga buatkan metadata quiz dengan judul menarik yang mencantumkan nama spesifik dari topik (misal: "Quiz PT. UBIG Malang"), deskripsi singkat, dan kategori yang sesuai.` : ''}

Format jawaban harus dalam JSON dengan struktur berikut:
{
  ${generateMetadata ? `"metadata": {
    "title": "Quiz [Nama Spesifik Topik]",
    "description": "Deskripsi singkat yang menyebutkan nama spesifik topik",
    "category": "business",
    "language": "${language}"
  },` : ''}
  "questions": [
    {
      "question_text": "Pertanyaan spesifik yang menyebutkan nama lengkap?",
      "answers": [
        { "answer_text": "Jawaban benar yang spesifik", "is_correct": true },
        { "answer_text": "Jawaban salah yang masuk akal 1", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal 2", "is_correct": false },
        { "answer_text": "Jawaban salah yang masuk akal 3", "is_correct": false }
      ]
    }
  ]
}

Kategori yang tersedia: general, science, math, history, geography, language, technology, sports, entertainment, business.

PENTING: Pastikan setiap pertanyaan dan jawaban menyebutkan nama/detail spesifik dari topik, bukan kata-kata umum!`;

    // Panggil API OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Kamu adalah pembuat quiz profesional yang sangat detail dan spesifik. 
          Kamu HARUS membuat pertanyaan yang sangat spesifik dengan menyebutkan nama lengkap dan detail yang tepat.
          JANGAN PERNAH membuat pertanyaan umum yang bisa berlaku untuk topik manapun.
          Selalu berikan respons dalam format JSON yang valid dalam bahasa ${language === 'id' ? 'Indonesia' : 'Inggris'}.`
        },
        {
          role: "user",
          content: systemPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.3, // Lebih rendah untuk hasil yang lebih konsisten dan akurat
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

    // Validasi struktur pertanyaan dengan pemeriksaan spesifisitas
    const questions = parsedData.questions || [];
    const validatedQuestions = questions
      .filter(q => {
        // Pastikan pertanyaan tidak terlalu umum
        const questionLower = q.question_text.toLowerCase();
        const isSpecific = 
          q.question_text && 
          Array.isArray(q.answers) && 
          q.answers.length >= 2 && 
          q.answers.some(a => a.is_correct) &&
          // Cek apakah pertanyaan cukup spesifik (tidak hanya kata umum)
          !(questionLower.includes('what is the full name') && questionLower.includes('company')) &&
          !(questionLower.includes('apa nama perusahaan') && !questionLower.includes('ubig'));
        
        return isSpecific;
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
        { error: "Tidak ada pertanyaan spesifik yang dihasilkan. Coba perbaiki prompt Anda dengan memberikan detail yang lebih spesifik." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      questions: validatedQuestions,
      metadata,
      contextInfo: {
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt,
        contextType: contextType,
        questionsGenerated: validatedQuestions.length
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
} 