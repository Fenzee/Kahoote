"use client"

import type React from "react"
import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { CameraIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarEditorProps {
  avatarUrl: string
  onAvatarChange: (file: File) => void
  className?: string
}

export function AvatarEditor({ avatarUrl, onAvatarChange, className }: AvatarEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      onAvatarChange(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("relative w-32 h-32 rounded-full overflow-hidden group", className)}>
      <motion.img
        key={previewUrl || "default"} // Key untuk memicu animasi ulang saat URL berubah
        src={previewUrl || "/placeholder.svg?height=128&width=128&query=user avatar"}
        alt="User Avatar"
        className="w-full h-full object-cover"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        layoutId="user-avatar" // Untuk animasi tata letak bersama jika digunakan di tempat lain
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
        onClick={handleClick}
        whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        whileTap={{ scale: 0.95 }}
      >
        <CameraIcon className="w-8 h-8 text-white" />
        <span className="sr-only">Edit Avatar</span>
      </motion.div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
    </div>
  )
}
