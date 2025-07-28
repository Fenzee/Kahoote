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

    // Validasi panjang prompt untuk memastikan cukup spesifik
    if (prompt.trim().length < 20) {
      return NextResponse.json(
        { error: "Prompt terlalu singkat. Berikan detail lebih spesifik untuk hasil yang lebih baik." },
        { status: 400 }
      );
    }

    // Validasi untuk memastikan prompt tidak terlalu umum
    const generalWords = ['perusahaan', 'tempat', 'hal', 'sesuatu', 'apa', 'siapa', 'dimana', 'kapan'];
    const specificWords = ['tahun', 'lokasi', 'alamat', 'produk', 'layanan', 'sejarah', 'pendirian', 'prestasi', 'penghargaan', 'karyawan', 'cabang', 'fakultas', 'jurusan', 'wisata', 'kuliner', 'museum', 'taman'];
    const promptLower = prompt.toLowerCase();
    const hasSpecificDetails = !generalWords.some(word => 
      promptLower.includes(word) && promptLower.split(word).length === 2
    );
    const hasSpecificKeywords = specificWords.some(word => promptLower.includes(word));
    
    if (!hasSpecificDetails && !hasSpecificKeywords && prompt.trim().length < 50) {
      return NextResponse.json(
        { error: "Prompt terlalu umum. Berikan detail spesifik seperti nama, lokasi, tahun, atau aspek tertentu yang ingin ditanyakan." },
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

    // Format prompt untuk OpenAI
    const systemPrompt = `Kamu adalah pembuat quiz profesional yang ahli dalam membuat pertanyaan quiz yang menarik dan edukatif.

${language === 'id' ? `
PETUNJUK KHUSUS UNTUK BAHASA INDONESIA:
1. Gunakan BAHASA INDONESIA untuk semua pertanyaan dan jawaban
2. Buat pertanyaan yang SPESIFIK dan DETAIL tentang topik yang diminta
3. Hindari pertanyaan yang terlalu umum seperti "Apa nama perusahaan?" atau "Apa kepanjangan dari singkatan?"
4. Fokus pada aspek-aspek yang lebih mendalam seperti:
   - Sejarah dan perkembangan
   - Produk atau layanan spesifik
   - Lokasi dan cabang
   - Prestasi dan penghargaan
   - Struktur organisasi
   - Kontribusi kepada masyarakat
   - Fakta-fakta unik dan menarik
5. Jawaban harus akurat dan berdasarkan informasi yang dapat diverifikasi
6. Gunakan bahasa yang formal namun mudah dipahami

CONTOH PERTANYAAN YANG BAIK:
- "Kapan perusahaan UBIG pertama kali didirikan di Malang?"
- "Apa produk unggulan yang diproduksi oleh UBIG?"
- "Di mana lokasi kantor pusat UBIG di Malang?"
- "Berapa jumlah karyawan yang bekerja di UBIG saat ini?"

CONTOH PERTANYAAN YANG KURANG BAIK:
- "Apa nama perusahaan?" (terlalu umum)
- "Apa kepanjangan UBIG?" (tidak spesifik)
- "Apakah UBIG ada di Malang?" (terlalu sederhana)
` : `
SPECIFIC INSTRUCTIONS FOR ENGLISH:
1. Use ENGLISH for all questions and answers
2. Create SPECIFIC and DETAILED questions about the requested topic
3. Avoid overly general questions like "What is the company name?" or "What does the abbreviation stand for?"
4. Focus on deeper aspects such as:
   - History and development
   - Specific products or services
   - Locations and branches
   - Achievements and awards
   - Organizational structure
   - Contributions to society
   - Unique and interesting facts
5. Answers must be accurate and based on verifiable information
6. Use formal but easily understandable language
`}

Buatkan ${count} pertanyaan quiz dengan 4 pilihan jawaban untuk topik berikut: ${prompt}.

${generateMetadata ? `Juga buatkan metadata quiz dengan judul menarik, deskripsi singkat, dan kategori yang sesuai dengan topik.` : ''}

Format jawaban harus dalam JSON dengan struktur berikut:
{
  ${generateMetadata ? `"metadata": {
    "title": "${language === 'id' ? 'Judul Quiz yang Menarik' : 'Interesting Quiz Title'}",
    "description": "${language === 'id' ? 'Deskripsi singkat tentang quiz ini' : 'Brief description about this quiz'}",
    "category": "general",
    "language": "${language}"
  },` : ''}
  "questions": [
    {
      "question_text": "${language === 'id' ? 'Pertanyaan spesifik tentang topik?' : 'Specific question about the topic?'}",
      "answers": [
        { "answer_text": "${language === 'id' ? 'Jawaban yang benar dan spesifik' : 'Correct and specific answer'}", "is_correct": true },
        { "answer_text": "${language === 'id' ? 'Jawaban salah yang masuk akal' : 'Plausible wrong answer'}", "is_correct": false },
        { "answer_text": "${language === 'id' ? 'Jawaban salah yang masuk akal' : 'Plausible wrong answer'}", "is_correct": false },
        { "answer_text": "${language === 'id' ? 'Jawaban salah yang masuk akal' : 'Plausible wrong answer'}", "is_correct": false }
      ]
    }
  ]
}

Kategori yang tersedia adalah: general, science, math, history, geography, language, technology, sports, entertainment, business.

PENTING:
- Pastikan hanya ada satu jawaban benar untuk setiap pertanyaan
- Jawaban harus masuk akal dan relevan dengan pertanyaan
- Pertanyaan harus SPESIFIK dan tidak terlalu umum
- Untuk bahasa Indonesia, gunakan tata bahasa yang benar dan formal
- Jangan tambahkan informasi atau teks lain selain JSON yang diminta
- Fokus pada aspek-aspek yang mendalam dan menarik dari topik yang diminta`;

    // Panggil API OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Kamu adalah pembuat quiz profesional. Selalu berikan respons dalam format JSON yang valid."
        },
        {
          role: "user",
          content: systemPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
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