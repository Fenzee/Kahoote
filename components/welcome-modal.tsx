"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Zap, CheckCircle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export default function WelcomeModal({ isOpen, onClose, username }: WelcomeModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation when modal opens
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const features = [
    {
      icon: Users,
      title: "Multiplayer Real-time",
      description: "Main bersama teman secara bersamaan",
    },
    {
      icon: Trophy,
      title: "Sistem Ranking",
      description: "Kompetisi sehat dengan leaderboard",
    },
    {
      icon: Zap,
      title: "Instant Play",
      description: "Langsung main tanpa ribet",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-blue-50 to-purple-50 border-0">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Selamat Datang{username ? `, ${username}` : ""}! 🎉
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg">
            Akun Anda berhasil dibuat! Mari mulai petualangan quiz yang seru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div className="text-center">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2">
              ✨ Akun Premium Gratis Selamanya
            </Badge>
          </div>

          <div className="space-y-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-2">Yang bisa Anda lakukan:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Buat quiz kustom dengan berbagai kategori</li>
              <li>• Bergabung dengan permainan multiplayer</li>
              <li>• Lihat ranking dan statistik permainan</li>
              <li>• Bagikan quiz ke teman-teman</li>
            </ul>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Mulai Sekarang! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}