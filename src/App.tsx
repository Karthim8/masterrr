/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { generateChallenge, WordData, PolysemyChallenge } from './services/ai';
import SemanticGraph from './components/SemanticGraph';
import VoiceButton from './components/VoiceButton';
import SpeechInput from './components/SpeechInput';
import { sounds } from './services/sounds';
import { Brain, Sparkles, Network, PlayCircle, CheckCircle2, XCircle, Loader2, Flame, Star, Trophy, ArrowRight, ListOrdered, RotateCcw, X, Volume2, Heart, PartyPopper, Clock, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { initDB } from './services/db';

export default function App() {
  const [word, setWord] = useState('படி');
  const [model, setModel] = useState('gemini');
  const [loading, setLoading] = useState(false);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'graph'>('game');
  
  // App Navigation & Auth
  const [view, setView] = useState<'game' | 'login' | 'admin'>('game');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    initDB();
  }, []);
  const [currentSenseIndex, setCurrentSenseIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [abilityLevel, setAbilityLevel] = useState(50); // IRT simulation 0-100
  const [shake, setShake] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(false);
  const [gameMode, setGameMode] = useState<'choice' | 'type'>('choice');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [highScores, setHighScores] = useState<{score: number, level: number, date: string, word: string}[]>(() => {
    const saved = localStorage.getItem('polysemy_highscores');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !selectedOption && !isCompleted) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !selectedOption && timerActive) {
      // Time's up!
      handleOptionClick(''); // Trigger incorrect with empty string
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, selectedOption, isCompleted]);

  const handleGenerate = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setWordData(null);
    setSelectedOption(null);
    setIsCorrect(null);
    setCurrentSenseIndex(0);
    setIsCompleted(false);
    
    try {
      const data = await generateChallenge(word.trim(), model);
      setWordData(data);
      setupGame(data, 0);
      setTimeLeft(45);
      setTimerActive(true);
    } catch (error) {
      console.error("Failed to generate challenge:", error);
      alert("Failed to generate challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setupGame = (data: WordData, index: number) => {
    if (!data.senses || data.senses.length <= index) return;
    const sense = data.senses[index];
    const allOptions = [sense.correct, ...sense.distractors];
    // Shuffle options
    setOptions(allOptions.sort(() => Math.random() - 0.5));
    setSelectedOption(null);
    setIsCorrect(null);
    setTypedAnswer('');
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedAnswer.trim() || selectedOption) return;
    handleOptionClick(typedAnswer.trim());
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    
    const currentSense = wordData?.senses[currentSenseIndex];
    if (currentSense) {
      const correct = option === currentSense.correct;
      setIsCorrect(correct);
      
      if (correct) {
        setScore(s => s + 10 + (streak * 2)); // Bonus for streak
        setStreak(s => s + 1);
        setAbilityLevel(a => Math.min(100, a + 5)); // Increase ability
        triggerConfetti();
        if (streak + 1 > 2) {
          sounds.playStreak();
        } else {
          sounds.playCorrect();
        }
      } else {
        if (streak > 0) {
          sounds.playLoss();
        } else {
          sounds.playIncorrect();
        }
        setStreak(0);
        setAbilityLevel(a => Math.max(0, a - 5)); // Decrease ability
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }
  };

  const triggerConfetti = () => {
    sounds.playConfetti();
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#8b5cf6', '#10b981', '#f59e0b']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#8b5cf6', '#10b981', '#f59e0b']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const nextChallenge = () => {
    if (!wordData) return;
    if (currentSenseIndex < wordData.senses.length - 1) {
      const nextIndex = currentSenseIndex + 1;
      setCurrentSenseIndex(nextIndex);
      setupGame(wordData, nextIndex);
      setTimeLeft(45);
      setTimerActive(true);
    } else {
      // End of challenges for this word
      setIsCompleted(true);
      
      // Save high score
      const newScore = { score, level: abilityLevel, date: new Date().toISOString(), word: wordData.word };
      setHighScores(prev => {
        const updated = [...prev, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
        localStorage.setItem('polysemy_highscores', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const confirmReset = () => {
    setScore(0);
    setStreak(0);
    setAbilityLevel(50);
    setWordData(null);
    setWord('');
    setIsCompleted(false);
    setTimeLeft(45);
    setTimerActive(false);
    setShowResetConfirm(false);
  };

  const handleAdminLogin = async (email: string, pass: string) => {
    if (email === 'karthikeyanspro@gmail.com' && pass === 'tesla123') {
      setIsAdmin(true);
      setView('admin');
      return true;
    }
    return false;
  };

  const currentSense = wordData?.senses[currentSenseIndex];
  const progress = wordData ? (isCompleted ? 100 : (currentSenseIndex / wordData.senses.length) * 100) : 0;

  // View Routing
  if (view === 'login') {
    return <AdminLogin onLogin={handleAdminLogin} onBack={() => setView('game')} />;
  }

  if (view === 'admin' && isAdmin) {
    return <AdminDashboard onBack={() => setView('game')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-pink-50 to-violet-100 text-slate-900 font-sans pb-12 selection:bg-violet-200 overflow-x-hidden">
      
      {/* Top Navigation / HUD */}
      <header className="bg-white/80 backdrop-blur-md border-b-4 border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-violet-600">
            <div className="bg-violet-100 p-2 rounded-xl border-2 border-violet-200">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-display font-black tracking-tight hidden sm:block text-slate-800">
              Polysemy<span className="text-violet-600">Play</span>
              <span className="text-pink-500 ml-1">✨</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <motion.div 
              key={`score-${score}`}
              initial={{ scale: 1.5, rotate: 10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex items-center gap-2 bg-amber-400 border-b-[4px] border-amber-600 text-white px-4 py-1.5 rounded-2xl font-black shadow-lg"
            >
              <Star className="w-5 h-5 fill-white" />
              <span>{score}</span>
            </motion.div>
            <motion.div 
              key={`streak-${streak}`}
              initial={{ scale: streak > 0 ? 1.5 : 1, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className={clsx("flex items-center gap-2 px-4 py-1.5 rounded-2xl border-b-[4px] font-black transition-all shadow-lg", streak > 2 ? "bg-orange-500 border-orange-700 text-white" : "bg-slate-200 border-slate-400 text-slate-500")}
            >
              <Flame className={clsx("w-5 h-5", streak > 2 && "fill-white")} />
              <span>{streak}</span>
            </motion.div>
            <div className="flex items-center gap-2 bg-violet-500 border-b-[4px] border-violet-700 text-white px-4 py-1.5 rounded-2xl font-black shadow-lg">
              <Trophy className="w-5 h-5 fill-white" />
              <span>Lvl {Math.floor(abilityLevel / 10)}</span>
            </div>
            {wordData && !isCompleted && (
              <div className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-2xl border-b-[4px] font-black shadow-lg transition-colors",
                timeLeft < 10 ? "bg-rose-500 border-rose-700 text-white animate-pulse" : "bg-sky-500 border-sky-700 text-white"
              )}>
                <Clock className="w-5 h-5" />
                <span>{timeLeft}s</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-2 border-l-2 border-slate-200 pl-4">
              <button onClick={() => setShowScoreboard(true)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl border-2 border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-2 font-bold" title="Scoreboard">
                <ListOrdered className="w-5 h-5" />
                <span className="hidden sm:inline">Scores</span>
              </button>
              <button onClick={() => setShowResetConfirm(true)} className="px-3 py-2 bg-rose-100 text-rose-600 rounded-xl border-2 border-rose-200 hover:bg-rose-200 transition-colors flex items-center gap-2 font-bold" title="Reset Progress">
                <RotateCcw className="w-5 h-5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Controls */}
        {!wordData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 sm:p-12 rounded-[2.5rem] border-4 border-slate-200 border-b-[8px] text-center relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="w-24 h-24 bg-gradient-to-br from-violet-400 to-pink-400 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-3 relative z-10 border-4 border-white shadow-xl">
              <Sparkles className="w-12 h-12" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-800 mb-4 relative z-10 tracking-tight">
              Master the <span className="text-violet-600">Meanings</span>
              <span className="block text-pink-500 text-2xl mt-2">Fun & Easy! 🌈</span>
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-10 text-lg relative z-10 font-bold">
              Enter a word or a full sentence. We'll find the tricky words and challenge you!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto relative z-10">
              <div className="flex-1 text-left relative">
                <input 
                  type="text" 
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="w-full px-6 py-4 pr-20 text-xl font-bold rounded-2xl border-4 border-slate-200 focus:border-violet-500 focus:ring-0 outline-none transition-all shadow-sm bg-white/80"
                  placeholder="e.g., படி or 'அவன் பாடம் படித்தான்'"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SpeechInput 
                    onTranscript={(text) => setWord(text)} 
                    className="scale-90"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleGenerate}
              disabled={loading || !word.trim()}
              className="mt-8 w-full max-w-xl mx-auto py-5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 active:from-violet-600 active:to-pink-600 text-white text-xl font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-b-[6px] border-violet-800 active:border-b-0 active:translate-y-[6px] relative z-10 shadow-xl"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : 'START CHALLENGE 🚀'}
            </button>
          </motion.div>
        )}

        {/* Main Content Area */}
        {wordData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] border-4 border-slate-200 border-b-[8px] overflow-hidden flex flex-col"
          >
            {/* Tabs & Mode Toggle */}
            {!isCompleted && (
              <div className="flex flex-col sm:flex-row p-4 gap-4 bg-slate-50 border-b-4 border-slate-200">
                <div className="flex flex-1 gap-4">
                  <button 
                    onClick={() => setActiveTab('game')}
                    className={clsx("flex-1 py-4 px-6 font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm", activeTab === 'game' ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white border-b-4 border-violet-700" : "bg-white text-slate-500 border-2 border-slate-200 hover:bg-slate-100")}
                  >
                    <PlayCircle className="w-6 h-6" /> PLAY
                  </button>
                  <button 
                    onClick={() => setActiveTab('graph')}
                    className={clsx("flex-1 py-4 px-6 font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm", activeTab === 'graph' ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white border-b-4 border-violet-700" : "bg-white text-slate-500 border-2 border-slate-200 hover:bg-slate-100")}
                  >
                    <Network className="w-6 h-6" /> SKILL TREE
                  </button>
                </div>
                
                {activeTab === 'game' && (
                  <div className="flex bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-sm">
                    <button 
                      onClick={() => setGameMode('choice')}
                      className={clsx("px-4 py-2 rounded-xl font-black text-sm transition-all", gameMode === 'choice' ? "bg-violet-500 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}
                    >
                      CHOICE
                    </button>
                    <button 
                      onClick={() => setGameMode('type')}
                      className={clsx("px-4 py-2 rounded-xl font-black text-sm transition-all", gameMode === 'type' ? "bg-violet-500 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}
                    >
                      TYPE
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {!isCompleted && activeTab === 'game' && (
              <div className="w-full bg-slate-200 h-8 p-1.5">
                <motion.div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full relative overflow-hidden shadow-inner"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/40 rounded-full mx-2 mt-1"></div>
                </motion.div>
              </div>
            )}

            <div className={clsx("relative overflow-hidden", !isCompleted && "p-6 sm:p-12")}>
              {/* Decorative background elements */}
              {!isCompleted && <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}

              {isCompleted && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8 relative z-20 bg-white border-b-4 border-slate-200 shadow-sm"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-200">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-display font-black text-slate-800 mb-2">Challenge Complete!</h2>
                  <p className="text-lg text-slate-600 mb-6 font-bold">You've mastered all the meanings for <strong className="text-violet-600 font-black">{wordData.word}</strong>.</p>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => { setWordData(null); setWord(''); setIsCompleted(false); setActiveTab('game'); }}
                      className="px-8 py-4 bg-green-500 text-white font-black text-lg rounded-2xl hover:bg-green-400 border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all"
                    >
                      LEARN A NEW WORD
                    </button>
                  </div>
                </motion.div>
              )}

              {!isCompleted && activeTab === 'game' && currentSense && (
                <div className="max-w-2xl mx-auto relative z-10">
                  
                  <div className="flex items-center justify-between mb-10">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-100 to-pink-100 text-violet-800 text-sm font-black border-2 border-violet-200 shadow-sm"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
                      Context: {currentSense.meaning}
                    </motion.div>
                    <div className="flex items-center gap-2">
                      <VoiceButton text={currentSense.meaning} className="scale-90 bg-white" />
                      <div className="text-sm font-black text-slate-400 bg-white px-4 py-2 rounded-xl border-2 border-slate-200 shadow-sm">
                        {currentSenseIndex + 1} / {wordData.senses.length}
                      </div>
                    </div>
                  </div>

                  {/* Sentence Area */}
                  <div className="relative group">
                    <motion.div 
                      animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="text-3xl sm:text-4xl font-display font-black text-slate-800 leading-relaxed text-center mb-16"
                    >
                      {currentSense.sentence.split('___').map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span 
                              className={clsx(
                                "inline-flex items-center justify-center min-w-[160px] h-[64px] mx-3 align-middle rounded-2xl transition-all duration-300",
                                selectedOption 
                                  ? (isCorrect 
                                      ? "bg-green-500 border-b-[6px] border-green-700 text-white" 
                                      : "bg-rose-500 border-b-[6px] border-rose-700 text-white")
                                  : "bg-slate-100 border-4 border-dashed border-slate-300"
                              )}
                            >
                              {selectedOption && (
                                <motion.span 
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  type="spring"
                                  className="text-2xl sm:text-3xl font-black"
                                >
                                  {selectedOption}
                                </motion.span>
                              )}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </motion.div>
                    
                    {/* Sentence Voice Button */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                      <VoiceButton 
                        text={currentSense.sentence.replace('___', selectedOption || wordData.word)} 
                        className="shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Options Area */}
                  {!selectedOption && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {gameMode === 'choice' ? (
                        <>
                          <p className="text-center text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Select the correct word</p>
                          <div className="flex flex-wrap justify-center gap-4">
                            {options.map((option, idx) => (
                              <motion.button
                                key={`${option}-${idx}`}
                                onClick={() => {
                                  handleOptionClick(option);
                                  sounds.playPop();
                                }}
                                whileHover={{ y: -8, scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                className="px-8 py-5 bg-white rounded-2xl font-display font-black text-2xl text-slate-700 border-4 border-slate-200 border-b-[8px] hover:border-violet-400 hover:text-violet-600 cursor-pointer active:border-b-4 active:translate-y-[4px] transition-all shadow-md"
                              >
                                {option}
                              </motion.button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="max-w-md mx-auto">
                          <p className="text-center text-sm font-black text-slate-400 uppercase tracking-wider mb-6">Type the correct word</p>
                          <form onSubmit={handleTypeSubmit} className="relative">
                            <input 
                              autoFocus
                              type="text"
                              value={typedAnswer}
                              onChange={(e) => setTypedAnswer(e.target.value)}
                              className="w-full px-8 py-6 text-3xl font-black text-center rounded-[2rem] border-4 border-slate-200 focus:border-violet-500 focus:ring-0 outline-none transition-all shadow-xl bg-white"
                              placeholder="..."
                            />
                            <button 
                              type="submit"
                              disabled={!typedAnswer.trim()}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-violet-500 text-white rounded-2xl flex items-center justify-center hover:bg-violet-400 disabled:opacity-50 transition-all shadow-lg"
                            >
                              <ArrowRight className="w-8 h-8" />
                            </button>
                          </form>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Feedback Area */}
                  <AnimatePresence>
                    {selectedOption && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={clsx(
                          "mt-8 p-6 rounded-3xl border-4 flex flex-col sm:flex-row items-center justify-between gap-6",
                          isCorrect ? "bg-green-50 border-green-200" : "bg-rose-50 border-rose-200"
                        )}
                      >
                        <div className="flex items-center gap-4 text-center sm:text-left">
                          <motion.div 
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            type="spring"
                            className={clsx(
                              "w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 border-b-8 shadow-lg",
                              isCorrect ? "bg-green-500 text-white border-green-700" : "bg-rose-500 text-white border-rose-700"
                            )}
                          >
                            {isCorrect ? <PartyPopper className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                          </motion.div>
                          <div>
                            <h3 className={clsx("text-3xl font-display font-black", isCorrect ? "text-green-700" : "text-rose-700")}>
                              {isCorrect ? "Amazing! 🌟" : "Not quite! 🎈"}
                            </h3>
                            <p className={clsx("text-xl font-bold mt-1", isCorrect ? "text-green-600" : "text-rose-600")}>
                              {isCorrect 
                                ? `+10 XP ${streak > 1 ? ` • ${streak} Streak Bonus! 🔥` : ''}` 
                                : "Don't worry, you can try again! 🔄"}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (isCorrect) {
                              nextChallenge();
                            } else {
                              setSelectedOption(null);
                              setIsCorrect(null);
                            }
                            sounds.playPop();
                          }}
                          className={clsx(
                            "w-full sm:w-auto px-12 py-6 text-white text-2xl font-black rounded-2xl transition-all flex items-center justify-center gap-2 border-b-[8px] active:border-b-0 active:translate-y-[8px] shadow-xl",
                            isCorrect 
                              ? "bg-green-500 hover:bg-green-400 border-green-700" 
                              : "bg-rose-500 hover:bg-rose-400 border-rose-700"
                          )}
                        >
                          {isCorrect 
                            ? (currentSenseIndex < wordData.senses.length - 1 ? "NEXT ONE! ➔" : "ALL DONE! 🎉")
                            : "TRY AGAIN! 🔄"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {(activeTab === 'graph' || isCompleted) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={clsx("bg-slate-50 relative z-10", isCompleted ? "h-[500px]" : "h-[600px] rounded-3xl border-4 border-slate-200 overflow-hidden")}
                >
                  <SemanticGraph data={wordData} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showScoreboard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] border-4 border-slate-200 border-b-[8px] w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-slate-50 border-b-4 border-slate-200 flex items-center justify-between">
                <h2 className="text-2xl font-display font-black text-slate-800 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" /> Top Scores
                </h2>
                <button onClick={() => setShowScoreboard(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {highScores.length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-8">No scores yet. Complete a word challenge to get on the board!</p>
                ) : (
                  <div className="space-y-3">
                    {highScores.map((hs, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-100 rounded-2xl border-2 border-slate-200">
                        <div className="flex items-center gap-4">
                          <span className={clsx("text-2xl font-black w-8 text-center", i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-400")}>
                            #{i + 1}
                          </span>
                          <div>
                            <div className="font-black text-slate-700 text-lg">{hs.score} pts</div>
                            <div className="text-xs font-bold text-slate-400">Word: <span className="text-slate-600">{hs.word}</span> • {new Date(hs.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-sm font-black text-violet-500 bg-violet-100 px-3 py-1 rounded-xl border-2 border-violet-200">
                          Lvl {Math.floor(hs.level / 10)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] border-4 border-slate-200 border-b-[8px] w-full max-w-sm p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border-4 border-rose-200">
                <RotateCcw className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-display font-black text-slate-800 mb-4">Reset Progress?</h3>
              <p className="text-slate-500 font-bold mb-8 text-lg">This will reset your score, streak, and level back to the beginning. This cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all">
                  CANCEL
                </button>
                <button onClick={confirmReset} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-1 transition-all">
                  RESET
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Admin Access */}
      {wordData && !isCompleted && (
        <footer className="max-w-3xl mx-auto px-4 mt-12 pb-12 flex justify-end">
          <button 
            onClick={() => setView('login')}
            className="text-slate-400 hover:text-violet-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-colors border-2 border-transparent hover:border-violet-100 px-4 py-2 rounded-xl"
          >
            <Lock className="w-3.5 h-3.5" />
            Admin Access
          </button>
        </footer>
      )}

      {!wordData && (
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => setView('login')}
            className="flex items-center gap-3 px-6 py-4 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-[0_8px_30px_rgba(124,58,237,0.4)] border-b-4 border-violet-800 active:border-b-0 active:translate-y-1 transition-all"
            title="Admin Moderation"
          >
            <Lock className="w-5 h-5" />
            <span className="text-sm tracking-tight">ADMIN PANEL</span>
          </button>
        </div>
      )}
    </div>
  );
}
