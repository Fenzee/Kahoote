"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AvatarEditor } from "@/components/avatar-editor"
import { Loader2 } from "lucide-react"

export function ProfileForm() {
  const [username, setUsername] = useState("johndoe")
  const [fullName, setFullName] = useState("John Doe")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("/placeholder.svg?height=128&width=128")
  const [isSaving, setIsSaving] = useState(false)

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file)
    // Untuk pratinjau langsung, buat URL dari file
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulasikan panggilan API
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log("Saving profile:", { username, fullName, avatarFile })
    setIsSaving(false)
    alert("Profile saved successfully!")
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  }

  return (
    <motion.div
      className="flex justify-center items-center min-h-[calc(100svh-theme(spacing.16))]"
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <Card className="w-full max-w-md p-6 shadow-lg rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Edit Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Perbarui informasi pribadi dan avatar Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <motion.div variants={itemVariants} className="flex justify-center mb-4">
            <AvatarEditor avatarUrl={avatarPreviewUrl} onAvatarChange={handleAvatarChange} />
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan nama pengguna Anda"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
