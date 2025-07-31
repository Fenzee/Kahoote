"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseGameAudioProps {
  isPlaying: boolean;
  volume?: number;
}

export const useGameAudio = ({ isPlaying, volume = 0.5 }: UseGameAudioProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playlist lagu game dengan urutan [1][2][3]
  const playlist = [
    "/sounds/game-music[1].mp3",
    "/sounds/game-music[2].mp3", 
    "/sounds/game-music[3].mp3"
  ];

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      audioRef.current.preload = "metadata";
      
      // Event listeners
      const handleCanPlay = () => setIsLoaded(true);
      const handleError = (e: Event) => {
        console.error("Audio error:", e);
        setError("Gagal memuat audio");
      };
      
      // Event listener untuk lagu selesai - otomatis next track
      const handleEnded = () => {
        setCurrentTrack((prev) => (prev + 1) % playlist.length);
      };

      audioRef.current.addEventListener("canplay", handleCanPlay);
      audioRef.current.addEventListener("error", handleError);
      audioRef.current.addEventListener("ended", handleEnded);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("canplay", handleCanPlay);
          audioRef.current.removeEventListener("error", handleError);
          audioRef.current.removeEventListener("ended", handleEnded);
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, []);

  // Load track when currentTrack changes
  useEffect(() => {
    if (audioRef.current && playlist[currentTrack]) {
      audioRef.current.src = playlist[currentTrack];
      audioRef.current.load();
      setIsLoaded(false);
      setError(null);
    }
  }, [currentTrack]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Error playing audio:", error);
          setError("Gagal memutar audio");
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isLoaded]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // Manual controls
  const nextTrack = useCallback(() => {
    setCurrentTrack((prev) => (prev + 1) % playlist.length);
  }, []);

  const prevTrack = useCallback(() => {
    setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length);
  }, []);

  const setTrack = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentTrack(index);
    }
  }, []);

  return {
    currentTrack,
    totalTracks: playlist.length,
    isLoaded,
    error,
    nextTrack,
    prevTrack,
    setTrack,
    getCurrentTrackName: () => `Lagu ${currentTrack + 1}`
  };
};