import React, { useState, useEffect } from 'react';
import { Check, X, ClipboardList, Trash2, ArrowLeft, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPendingChallenges, approveChallenge, deleteChallenge } from '../services/db';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const data = await getPendingChallenges();
    setPending(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    setActionId(id);
    await approveChallenge(id);
    await fetchPending();
    setActionId(null);
  };

  const handleDelete = async (id: number) => {
    setActionId(id);
    await deleteChallenge(id);
    await fetchPending();
    setActionId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-display font-black text-slate-800">Moderation Queue</h1>
              <p className="text-slate-500 font-bold">Review and approve AI-generated challenges</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchPending}
              disabled={loading}
              className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm font-black text-xs text-slate-500 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              REFRESH
            </button>
            <div className="bg-violet-100 text-violet-700 px-6 py-3 rounded-2xl border-2 border-violet-200 font-black flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {pending.length} Pending
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
            <p className="text-slate-400 font-bold">Fetching latest challenges...</p>
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white rounded-[2rem] border-4 border-dashed border-slate-200 p-24 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-400">All caught up!</h3>
            <p className="text-slate-400 font-bold mt-2">No pending challenges to moderate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {pending.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="bg-white rounded-[2rem] border-4 border-slate-200 p-8 shadow-sm group hover:border-violet-300 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-display font-black text-violet-600 bg-violet-50 px-4 py-2 rounded-xl border-2 border-violet-100">
                          {item.word}
                        </span>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100">
                          {item.meaning}
                        </span>
                      </div>
                      
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <p className="text-2xl font-black text-slate-700 leading-relaxed italic">
                          "{item.sentence.replace('___', '______')}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-green-50 border-2 border-green-100 rounded-xl">
                          <p className="text-[10px] font-black text-green-600 uppercase mb-1">Correct</p>
                          <p className="text-lg font-black text-green-700">{item.correct}</p>
                        </div>
                        {item.distractors.map((d: string, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Distractor</p>
                            <p className="text-lg font-bold text-slate-600">{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center justify-center gap-4 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={actionId === item.id}
                        className="flex-1 lg:w-32 py-4 bg-green-500 text-white font-black rounded-2xl border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center gap-2 hover:bg-green-400 disabled:opacity-50"
                      >
                        {actionId === item.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionId === item.id}
                        className="flex-1 lg:w-32 py-4 bg-rose-500 text-white font-black rounded-2xl border-b-[6px] border-rose-700 active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center gap-2 hover:bg-rose-400 disabled:opacity-50"
                      >
                        {actionId === item.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
                        REJECT
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
