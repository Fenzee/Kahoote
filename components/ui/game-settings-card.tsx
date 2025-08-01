import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Settings, Lock, Unlock, Timer, Trophy, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GameSettingsCardProps {
  open: boolean;
  onClose: () => void;
  totalTimeMinutes: number;
  setTotalTimeMinutes: (v: number) => void;
  gameEndMode: 'first_finish' | 'wait_timer';
  setGameEndMode: (v: 'first_finish' | 'wait_timer') => void;
  allowJoinAfterStart: boolean;
  setAllowJoinAfterStart: (v: boolean) => void;
}

export const GameSettingsCard: React.FC<GameSettingsCardProps> = ({
  open,
  onClose,
  totalTimeMinutes,
  setTotalTimeMinutes,
  gameEndMode,
  setGameEndMode,
  allowJoinAfterStart,
  setAllowJoinAfterStart,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <Card className="relative bg-white shadow-2xl rounded-2xl p-0 overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 p-6 border-b">
                <Settings className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-lg font-semibold">Pengaturan Permainan</CardTitle>
                <Button size="icon" variant="ghost" className="ml-auto" onClick={onClose}>
                  <span className="sr-only">Tutup</span>
                  <X className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span className="flex-1">Waktu Total (menit)</span>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={totalTimeMinutes}
                    onChange={e => setTotalTimeMinutes(Number(e.target.value) || 1)}
                    className="w-20 text-center"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-purple-500" />
                    <span className="flex-1">Mode Akhir Permainan</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant={gameEndMode === 'wait_timer' ? 'default' : 'outline'}
                      className="flex-1 flex items-center gap-2"
                      onClick={() => setGameEndMode('wait_timer')}
                    >
                      <Clock className="w-4 h-4" />
                      Tunggu Timer
                    </Button>
                    <Button
                      variant={gameEndMode === 'first_finish' ? 'default' : 'outline'}
                      className="flex-1 flex items-center gap-2"
                      onClick={() => setGameEndMode('first_finish')}
                    >
                      <Trophy className="w-4 h-4" />
                      First to Finish
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span className="flex-1">User bisa join setelah mulai?</span>
                  <Switch checked={allowJoinAfterStart} onCheckedChange={setAllowJoinAfterStart} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};