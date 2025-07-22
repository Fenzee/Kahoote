"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  X, 
  Send,
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  nickname: string;
  message: string;
  created_at: string;
  avatar_url?: string | null;
}

interface ChatPanelProps {
  sessionId: string;
  userId: string | null;
  nickname: string;
  avatarUrl?: string | null;
  position?: 'right' | 'bottom';
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatPanel({ 
  sessionId, 
  userId, 
  nickname,
  avatarUrl,
  position = 'right' 
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load initial messages and set up real-time listener
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("game_chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Error loading chat messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadMessages();
      
      // Set up realtime subscription
      const channel = supabase
        .channel(`chat_${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "game_chat_messages",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId, isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && isOpen) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const { error } = await supabase.from("game_chat_messages").insert({
        session_id: sessionId,
        user_id: userId,
        nickname: nickname,
        message: newMessage.trim(),
        avatar_url: avatarUrl
      });
      
      if (error) throw error;
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="icon"
        className={`fixed ${
          position === 'right' ? 'bottom-5 right-5' : 'bottom-20 right-5'
        } z-50 rounded-full w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-lg`}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </Button>

      {/* Chat Panel */}
      <div
        className={`fixed ${
          position === 'right' 
            ? 'right-0 top-0 bottom-0 w-80 md:w-96 transition-transform duration-300 ease-in-out shadow-lg z-40 bg-white' 
            : 'right-0 bottom-0 w-full md:w-96 h-96 transition-transform duration-300 ease-in-out shadow-lg z-40 bg-white'
        } ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col border-l`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-purple-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Game Chat</h3>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-purple-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea 
          className="flex-1 p-4"
          ref={scrollAreaRef}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Belum ada pesan</p>
              <p className="text-sm">Mulai percakapan sekarang!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.user_id === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] ${
                      msg.user_id === userId ? "flex-row-reverse" : "flex-row"
                    } gap-2 items-start`}
                  >
                    <Avatar className={`h-8 w-8 ${msg.user_id === userId ? 'ml-2' : 'mr-2'}`}>
                      <AvatarImage
                        src={msg.avatar_url || `https://robohash.org/${encodeURIComponent(msg.nickname)}.png`}
                        alt={msg.nickname}
                      />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                        {getInitials(msg.nickname)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={`px-4 py-2 rounded-xl ${
                          msg.user_id === userId
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-1 ${
                          msg.user_id === userId ? "text-purple-100" : "text-gray-600"
                        }`}>
                          {msg.nickname}
                        </p>
                        <p className="break-words">{msg.message}</p>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          msg.user_id === userId ? "text-right" : "text-left"
                        } text-gray-500`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form
          className="p-3 border-t flex items-center gap-2"
          onSubmit={handleSubmit}
        >
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim()}
            className="h-10 w-10 rounded-full bg-purple-600 text-white hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
} 