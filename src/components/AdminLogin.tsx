import React, { useState } from 'react';
import { LogIn, Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLoginProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onBack: () => void;
}

export default function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const success = await onLogin(email, password);
    if (!success) {
      setError('Invalid admin credentials. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-100 rounded-full blur-[100px] opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-100 rounded-full blur-[100px] opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 border-b-[8px] p-10 shadow-xl overflow-hidden">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            BACK TO GAME
          </button>

          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-4 border-2 border-violet-200">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-black text-slate-800">Admin Login</h1>
            <p className="text-slate-500 font-bold mt-1">Verification Required</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Email Address</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl focus:border-violet-500 outline-none font-bold transition-all"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl focus:border-violet-500 outline-none font-bold transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-xl flex items-center gap-3 font-bold text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black text-lg rounded-2xl border-b-[6px] border-violet-800 active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <LogIn className="w-6 h-6" />}
              VERIFY ACCESS
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-400 font-bold text-sm">
          Strictly for authorized administrators only.
        </p>
      </motion.div>
    </div>
  );
}
