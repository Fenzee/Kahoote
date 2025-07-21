"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { uploadImage } from "@/lib/upload-image";
import {
  User,
  Mail,
  Camera,
  Loader2,
  Save,
  ArrowLeft,
  Slack,
  Shield,
  Key,
  LogOut,
  Trash2
} from "lucide-react";

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    fullname: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    fullname: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      fetchUserProfile();
    }
  }, [user, authLoading, router]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, fullname, email, avatar_url, created_at")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Gagal memuat profil");
        return;
      }

      setUserProfile(data);
      setFormData({
        username: data.username || "",
        fullname: data.fullname || "",
      });
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      toast.error("Terjadi kesalahan saat memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Check if username is already taken (but not by current user)
      if (formData.username !== userProfile?.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", formData.username)
          .neq("id", user.id)
          .single();

        if (existingUser) {
          toast.error("Username sudah digunakan");
          setSaving(false);
          return;
        }
      }

      // Prepare update data
      const updateData = {
        username: formData.username,
        fullname: formData.fullname,
      };

      // Add updated_at if the column exists in the profiles table
      try {
        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (error) {
          console.error("Specific update error:", error);
          throw error;
        }

        toast.success("Profil berhasil diperbarui");
        fetchUserProfile(); // Refresh data
      } catch (updateError: any) {
        console.error("Error in update operation:", updateError);
        
        // If the error is related to updated_at column, try without it
        if (updateError.message && updateError.message.includes("updated_at")) {
          try {
            const { error: retryError } = await supabase
              .from("profiles")
              .update({
                username: formData.username,
                fullname: formData.fullname,
              })
              .eq("id", user.id);
            
            if (retryError) throw retryError;
            
            toast.success("Profil berhasil diperbarui");
            fetchUserProfile(); // Refresh data
          } catch (finalError: any) {
            console.error("Final error:", finalError);
            toast.error(finalError.message || "Gagal memperbarui profil");
          }
        } else {
          toast.error(updateError.message || "Gagal memperbarui profil");
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingImage(true);

    try {
      // Process image before upload to ensure it's square
      const processedFile = await processImageForAvatar(file);
      
      // Upload image to storage
      const imageUrl = await uploadImage(processedFile, `avatars/${user.id}`);

      if (!imageUrl) {
        throw new Error("Gagal mengunggah gambar");
      }

      // Update profile with new avatar URL
      try {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            avatar_url: imageUrl,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        toast.success("Foto profil berhasil diperbarui");
        fetchUserProfile(); // Refresh data
      } catch (updateError: any) {
        console.error("Error updating avatar:", updateError);
        toast.error(updateError.message || "Gagal memperbarui foto profil");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Gagal mengunggah gambar");
    } finally {
      setUploadingImage(false);
    }
  };

  // Process image to ensure it's square with proper aspect ratio
  const processImageForAvatar = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create a square canvas with the minimum dimension
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        // Calculate position to crop from center
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        // Draw the image on the canvas (cropped to square)
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not create image blob'));
            return;
          }
          
          // Create a new file from the blob
          const processedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          resolve(processedFile);
        }, file.type);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Load the image from the file
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Gagal keluar");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center text-blue-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Profil tidak ditemukan
            </h2>
            <p className="text-gray-600 mb-4">Silakan login terlebih dahulu</p>
            <Button 
              onClick={() => router.push("/auth/login")}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="border-2 border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Slack className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Profil Saya</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left side - Avatar and basic info */}
              <div className="flex flex-col items-center md:w-1/3">
                <div className="relative">
                  <div className="rounded-full overflow-hidden w-32 h-32 border-4 border-white shadow-lg">
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={userProfile.avatar_url || `https://robohash.org/${encodeURIComponent(user.email || "user")}.png`} 
                        alt={userProfile.username} 
                        className="object-cover w-full h-full"
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-4xl">
                        {userProfile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </label>
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </div>
                <h2 className="text-2xl font-bold mt-4">{userProfile.username}</h2>
                <p className="text-gray-600">{userProfile.email}</p>
                <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200">
                  Bergabung {new Date(userProfile.created_at).toLocaleDateString()}
                </Badge>
              </div>

              {/* Right side - Edit profile form */}
              <div className="md:w-2/3">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-200/50 rounded-lg p-1 shadow-inner mb-6">
                    <TabsTrigger
                      value="profile"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
                    >
                      Profil
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
                    >
                      Keamanan
                    </TabsTrigger>
                  </TabsList>

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-700 font-medium">
                          Username
                        </Label>
                        <div className="relative">
                          <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="username"
                            name="username"
                            type="text"
                            placeholder="username_anda"
                            value={formData.username}
                            onChange={handleInputChange}
                            className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullname" className="text-gray-700 font-medium">
                          Nama Lengkap
                        </Label>
                        <div className="relative">
                          <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="fullname"
                            name="fullname"
                            type="text"
                            placeholder="Nama lengkap anda"
                            value={formData.fullname}
                            onChange={handleInputChange}
                            className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={userProfile.email}
                            className="pl-12 h-12 border-2 border-gray-200 bg-gray-100 rounded-xl"
                            disabled
                          />
                        </div>
                        <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
                      </div>

                      <Button
                        onClick={handleSaveProfile}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mt-4"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security" className="space-y-6">
                    <Card className="border border-gray-200">
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg">Keamanan Akun</CardTitle>
                        </div>
                        <CardDescription>
                          Kelola pengaturan keamanan akun Anda
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start border-gray-200 hover:bg-gray-50"
                          onClick={() => router.push("/auth/reset-password")}
                        >
                          <Key className="w-4 h-4 mr-2 text-gray-500" />
                          Ubah Password
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                          onClick={handleSignOut}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Keluar
                        </Button>

                        <div className="pt-4 border-t border-gray-200">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus Akun
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            Menghapus akun akan menghapus semua data Anda secara permanen.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
