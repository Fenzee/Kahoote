import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Lightbulb, CheckCircle, AlertCircle, Building2, MapPin, GraduationCap, Globe } from 'lucide-react';

interface AIPromptHelperProps {
  onPromptGenerated: (prompt: string) => void;
  currentPrompt: string;
}

export function AIPromptHelper({ onPromptGenerated, currentPrompt }: AIPromptHelperProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [specificDetails, setSpecificDetails] = useState<string>('');

  const categories = [
    {
      id: 'company',
      title: 'Perusahaan',
      icon: Building2,
      description: 'Buat soal tentang perusahaan atau organisasi',
      examples: ['PT. UBIG di Malang', 'CV. Maju Jaya Jakarta', 'Bank BCA']
    },
    {
      id: 'geography',
      title: 'Geografi/Tempat',
      icon: MapPin,
      description: 'Buat soal tentang kota, daerah, atau lokasi',
      examples: ['Kota Malang', 'Kabupaten Malang', 'Provinsi Jawa Timur']
    },
    {
      id: 'education',
      title: 'Pendidikan',
      icon: GraduationCap,
      description: 'Buat soal tentang sekolah atau universitas',
      examples: ['Universitas Brawijaya', 'SMA Negeri 1 Malang', 'Institut Teknologi Sepuluh Nopember']
    },
    {
      id: 'general',
      title: 'Umum',
      icon: Globe,
      description: 'Topik lainnya',
      examples: ['Sejarah Indonesia', 'Teknologi AI', 'Olahraga Sepak Bola']
    }
  ];

  const generatePrompt = () => {
    let prompt = '';
    
    if (selectedCategory === 'company') {
      prompt = `${entityName}${location ? ` di ${location}` : ''}`;
      if (specificDetails) {
        prompt += ` - ${specificDetails}`;
      }
    } else if (selectedCategory === 'geography') {
      prompt = `${entityName}${location ? ` di ${location}` : ''}`;
      if (specificDetails) {
        prompt += ` - fokus pada ${specificDetails}`;
      }
    } else if (selectedCategory === 'education') {
      prompt = `${entityName}${location ? ` di ${location}` : ''}`;
      if (specificDetails) {
        prompt += ` - ${specificDetails}`;
      }
    } else {
      prompt = entityName;
      if (specificDetails) {
        prompt += ` - ${specificDetails}`;
      }
    }

    onPromptGenerated(prompt);
  };

  const getPromptQuality = (prompt: string) => {
    const promptLower = prompt.toLowerCase();
    let score = 0;
    let issues = [];
    let suggestions = [];

    // Cek spesifisitas
    if (prompt.length < 10) {
      issues.push('Prompt terlalu pendek');
      suggestions.push('Tambahkan detail lebih spesifik');
    } else {
      score += 25;
    }

    // Cek nama spesifik
    if (promptLower.includes('ubig') || promptLower.includes('pt.') || promptLower.includes('cv.') || 
        promptLower.includes('universitas') || promptLower.includes('sekolah')) {
      score += 25;
    } else {
      issues.push('Tidak ada nama spesifik entitas');
      suggestions.push('Sebutkan nama lengkap perusahaan/institusi');
    }

    // Cek lokasi
    if (promptLower.includes('malang') || promptLower.includes('jakarta') || 
        promptLower.includes('surabaya') || promptLower.includes('kota') || 
        promptLower.includes('kabupaten')) {
      score += 25;
    } else {
      suggestions.push('Tambahkan informasi lokasi');
    }

    // Cek konteks
    if (promptLower.includes('perusahaan') || promptLower.includes('company') ||
        promptLower.includes('bidang') || promptLower.includes('bergerak')) {
      score += 25;
    } else {
      suggestions.push('Tambahkan konteks atau bidang usaha');
    }

    return { score, issues, suggestions };
  };

  const promptQuality = getPromptQuality(currentPrompt);

  const getQualityColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 75) return CheckCircle;
    return AlertCircle;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Bantuan Buat Soal yang Spesifik
        </CardTitle>
        <CardDescription>
          Gunakan panduan ini untuk membuat prompt yang menghasilkan soal lebih spesifik dan berkualitas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Kualitas Prompt Saat Ini */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {React.createElement(getQualityIcon(promptQuality.score), {
              className: `h-4 w-4 ${getQualityColor(promptQuality.score)}`
            })}
            <span className={`font-medium ${getQualityColor(promptQuality.score)}`}>
              Kualitas Prompt: {promptQuality.score}%
            </span>
          </div>
          
          {promptQuality.issues.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-red-600 mb-1">Masalah:</p>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {promptQuality.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          {promptQuality.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Saran:</p>
              <ul className="text-sm text-blue-600 list-disc list-inside">
                {promptQuality.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label className="text-sm font-medium mb-2 block">Pilih Kategori Topik:</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className={`cursor-pointer transition-colors ${
                  selectedCategory === category.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <category.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{category.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{category.description}</p>
                  <div className="space-y-1">
                    {category.examples.slice(0, 2).map((example, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Form Input */}
        {selectedCategory && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nama {selectedCategory === 'company' ? 'Perusahaan' : 
                      selectedCategory === 'education' ? 'Institusi' : 
                      selectedCategory === 'geography' ? 'Tempat' : 'Topik'}:
              </label>
              <Input
                placeholder={
                  selectedCategory === 'company' ? 'Contoh: PT. UBIG' :
                  selectedCategory === 'education' ? 'Contoh: Universitas Brawijaya' :
                  selectedCategory === 'geography' ? 'Contoh: Kota Malang' : 
                  'Contoh: Teknologi AI'
                }
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Lokasi (opsional):</label>
              <Input
                placeholder="Contoh: Malang, Jakarta, Jawa Timur"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Detail Spesifik (opsional):</label>
              <Textarea
                placeholder={
                  selectedCategory === 'company' ? 'Contoh: bergerak di bidang teknologi, memiliki kantor pusat' :
                  selectedCategory === 'education' ? 'Contoh: fakultas teknik, program studi, sejarah kampus' :
                  selectedCategory === 'geography' ? 'Contoh: wisata, sejarah, ekonomi, budaya' :
                  'Contoh: perkembangan terbaru, aplikasi praktis'
                }
                value={specificDetails}
                onChange={(e) => setSpecificDetails(e.target.value)}
              />
            </div>

            <Button 
              onClick={generatePrompt}
              disabled={!entityName.trim()}
              className="w-full"
            >
              Gunakan Prompt Ini
            </Button>
          </div>
        )}

        {/* Contoh Prompt yang Baik vs Buruk */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Contoh Prompt:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700">✅ Prompt yang Baik</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="bg-green-50 p-2 rounded">
                    "PT. UBIG di Malang"
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    "Universitas Brawijaya Malang - fakultas dan program studi"
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    "Kota Malang - wisata dan sejarah"
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700">❌ Prompt yang Buruk</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded">
                    "perusahaan"
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    "company in malang"
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    "universitas"
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}