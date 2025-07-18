"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Slack, Users, ArrowBigLeft, X, Camera } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import jsQR for QR code scanning
const jsQR = dynamic(() => import('jsqr'), { ssr: false });

export default function JoinGamePage() {
  const [gamePin, setGamePin] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-fill game PIN if provided in URL
  useEffect(() => {
    const pinFromUrl = searchParams.get("pin");
    if (pinFromUrl) {
      setGamePin(pinFromUrl);
    }
  }, [searchParams]);

  // Handle QR Scanner setup and teardown
  useEffect(() => {
    let animationFrame: number;
    const scanQRCode = async () => {
      if (!showScanner) return;
      if (!videoRef.current || !canvasRef.current) return;

      try {
        if (!stream) {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            await videoRef.current.play();
          }
        }

        // Make sure video is ready
        if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
          animationFrame = requestAnimationFrame(scanQRCode);
          return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            console.log("QR Code detected:", code.data);
            processQRCode(code.data);
            return;
          }
        }

        animationFrame = requestAnimationFrame(scanQRCode);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setScannerError("Gagal mengakses kamera. Pastikan kamera diizinkan.");
      }
    };

    if (showScanner) {
      scanQRCode();
    } else {
      // Clean up when scanner is hidden
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showScanner, stream]);

  const processQRCode = (scannedText: string) => {
    try {
      let pin;
      
      // Check if it's a URL with PIN parameter
      if (scannedText.includes('?pin=')) {
        const url = new URL(scannedText);
        pin = url.searchParams.get('pin');
      } else if (scannedText.match(/^\d{6}$/)) {
        // Check if it's a 6-digit PIN directly
        pin = scannedText;
      }
      
      if (pin && pin.match(/^\d{6}$/)) {
        setGamePin(pin);
        setShowScanner(false); // Close scanner after successful scan
      } else {
        setScannerError("QR code tidak valid. Pastikan QR code berisi PIN game yang benar.");
      }
    } catch (err) {
      setScannerError("Gagal membaca QR code. Silakan coba lagi.");
      console.error("QR scanner error:", err);
    }
  };

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamePin.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Ambil user dari session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Kamu harus login untuk join game.");
        return;
      }

      // Ambil username dari profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setError("Gagal mengambil username.");
        return;
      }

      // Cek session game
      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, quiz_id")
        .eq("game_pin", gamePin.trim())
        .eq("status", "waiting")
        .single();

      if (sessionError || !session) {
        setError("Game PIN tidak valid atau game sudah dimulai");
        return;
      }

      // Cek apakah username sudah dipakai
      const { data: existingParticipant } = await supabase
        .from("game_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("nickname", profile.username)
        .single();

      if (existingParticipant) {
        setError("Username kamu sudah dipakai di game ini.");
        return;
      }

      // Join game dengan username
      const { data: participant, error: participantError } = await supabase
        .from("game_participants")
        .insert({
          session_id: session.id,
          user_id: user.id,
          nickname: profile.username,
        })
        .select()
        .single();

      if (participantError) throw participantError;

      router.push(`/play/${session.id}?participant=${participant.id}`);
    } catch (error: any) {
      console.error("Error joining game:", error);
      setError("Gagal bergabung ke game. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Slack className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">GolekQuiz</span>
          </Link>
          <Link
            href="/"
            className="text-gray-600 hover:bg-white hover:text-purple-600 transition-colors flex items-center gap-1 px-3 py-2 rounded-lg"
          >
            <ArrowBigLeft />
            Back
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-10 pb-16">
        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                {showScanner ? <Camera className="w-8 h-8 text-white" /> : <Users className="w-8 h-8 text-white" />}
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {showScanner ? "Scan QR Code" : "Gabung Game"}
              </CardTitle>
              <p className="text-gray-600">
                {showScanner ? "Arahkan kamera ke QR code untuk bergabung" : "Masukkan Game PIN untuk bergabung"}
              </p>
            </CardHeader>
            <CardContent>
              {showScanner ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover"
                        playsInline
                      />
                      <canvas 
                        ref={canvasRef} 
                        className="hidden"
                      />
                      <div className="absolute inset-0 border-2 border-white/50 rounded-lg pointer-events-none">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowScanner(false)}
                      className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white"
                      aria-label="Tutup scanner"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {scannerError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm text-center">{scannerError}</p>
                    </div>
                  )}
                  
                  <p className="text-sm text-center text-gray-500">
                    Pastikan QR code terlihat jelas dan ada dalam jangkauan kamera
                  </p>
                  
                  <Button
                    type="button"
                    onClick={() => setShowScanner(false)}
                    className="w-full"
                  >
                    Input PIN Manual
                  </Button>
                </div>
              ) : (
                <form onSubmit={joinGame} className="space-y-6">
                  <div className="space-y-6">
                    <div className="relative">
                      <Label htmlFor="gamePin" className="text-base font-medium">
                        Game PIN
                      </Label>
                      <Input
                        id="gamePin"
                        type="text"
                        value={gamePin}
                        onChange={(e) =>
                          setGamePin(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="123456"
                        className="mt-2 text-center text-2xl tracking-[0.5em] font-bold h-16 border-2 focus:border-blue-500 rounded-xl"
                        maxLength={6}
                        required
                      />
                    </div>
                    
                    <div className="text-center">
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-300"></span>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 text-gray-500 bg-white">atau</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="mt-2 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Scan QR Code
                      </button>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm text-center">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={loading || !gamePin.trim()}
                    >
                      {loading ? "Bergabung..." : "Gabung Game"}
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Belum punya Game PIN?{" "}
                  <Link
                    href="/auth/register"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Buat quiz sendiri
                  </Link>
                </p>
                <div className="mt-4">
                  <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                    ← Kembali ke beranda
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
