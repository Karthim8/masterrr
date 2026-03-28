import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { createGeminiSTT, RecordingState, GeminiSTTController } from '../services/stt';

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function SpeechInput({ onTranscript, className }: SpeechInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Keep onTranscript stable in a ref so the controller doesn't need recreation
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const controllerRef = useRef<GeminiSTTController | null>(null);

  useEffect(() => {
    // Check for basic MediaRecorder support
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setIsSupported(false);
      return;
    }

    controllerRef.current = createGeminiSTT(
      (text) => onTranscriptRef.current(text),
      (newState) => setState(newState),
      (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
      },
      8 // max 8 seconds of recording
    );
  }, []);

  const handleClick = useCallback(() => {
    if (!controllerRef.current) return;
    setError(null);

    if (state === 'idle') {
      controllerRef.current.start();
    } else if (state === 'recording') {
      controllerRef.current.stop();
    }
    // 'processing' state: button is disabled, do nothing
  }, [state]);

  if (!isSupported) {
    return (
      <button
        disabled
        className={clsx('p-3 rounded-2xl bg-slate-100 text-slate-400 cursor-not-allowed opacity-50', className)}
        title="Voice input not supported in this browser. Use Chrome or Edge."
      >
        <MicOff className="w-6 h-6" />
      </button>
    );
  }

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  const statusLabel = isRecording
    ? 'Recording… tap to stop'
    : isProcessing
    ? 'Transcribing…'
    : 'Speak in Tamil';

  return (
    <div className="relative group">
      <motion.button
        type="button"
        whileHover={state === 'idle' ? { scale: 1.05 } : {}}
        whileTap={state !== 'processing' ? { scale: 0.95 } : {}}
        onClick={handleClick}
        disabled={isProcessing}
        className={clsx(
          'p-4 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden',
          isRecording
            ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : isProcessing
            ? 'bg-violet-400 text-white cursor-wait'
            : 'bg-violet-100 text-violet-600 hover:bg-violet-200 border-2 border-violet-200',
          className
        )}
        title={statusLabel}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div key="processing" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          ) : isRecording ? (
            <motion.div key="mic-on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic className="w-6 h-6 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div key="mic-idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulsing rings when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-ping opacity-75" />
            <span className="absolute inset-0 rounded-2xl border-4 border-white/20 animate-pulse" />
          </>
        )}
      </motion.button>

      {/* Status tooltip (recording/processing) */}
      <AnimatePresence>
        {(isRecording || isProcessing) && !error && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={clsx(
              'absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 text-white text-xs font-bold rounded-lg shadow-lg whitespace-nowrap z-50',
              isProcessing ? 'bg-violet-500' : 'bg-rose-500'
            )}
          >
            {statusLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-lg z-50 max-w-[220px] text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
