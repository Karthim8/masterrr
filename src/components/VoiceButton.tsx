import React, { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { speakTamil, playAudio } from '../services/tts';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface VoiceButtonProps {
  text: string;
  className?: string;
}

export default function VoiceButton({ text, className }: VoiceButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      const audioData = await speakTamil(text);
      if (audioData) {
        playAudio(audioData);
      }
    } catch (error) {
      console.error("Failed to speak:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleSpeak}
      disabled={loading}
      className={clsx(
        "p-2 rounded-full bg-violet-100 text-violet-600 border-2 border-violet-200 hover:bg-violet-200 transition-colors disabled:opacity-50",
        className
      )}
      title="Listen to Tamil pronunciation"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
    </motion.button>
  );
}
