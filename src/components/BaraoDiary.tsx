/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, DiaryEntry, Message } from "../types";
import { 
  Sparkles, 
  Settings, 
  BookOpen, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Flame, 
  Heart, 
  Calendar, 
  MessageSquare, 
  RefreshCw, 
  Check, 
  Sliders, 
  AlertCircle 
} from "lucide-react";

import BaraoPaywall from "./BaraoPaywall";
import { syncDiaryEntries, getDiaryEntries, getAllUserMessagesByDate } from "../utils/firebaseSync";

interface BaraoDiaryProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export default function BaraoDiary({ currentUser, onPromptAuth, onUserUpdate }: BaraoDiaryProps) {
  // Check if premium or elite
  const isLicensed = currentUser && (currentUser.plan === "premium" || currentUser.plan === "elite");

  if (!isLicensed) {
    return (
      <BaraoPaywall
        currentUser={currentUser}
        onPromptAuth={onPromptAuth}
        onUserUpdate={onUserUpdate}
        featureName="Meu Diário Poético"
      />
    );
  }

  const autoGenStorageKey = currentUser ? `barao_diary_auto_${currentUser.id}` : "barao_diary_auto_guest";

  // State
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(true);
  
  // UI States
  const [generatingDays, setGeneratingDays] = useState<Record<string, boolean>>({});
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [deleteConfirmDayId, setDeleteConfirmDayId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Refs to prevent background race conditions and infinite error retries
  const inProgressRef = useRef<Record<string, boolean>>({});
  const attemptedRef = useRef<Record<string, boolean>>({});

  // Load configuration and data
  useEffect(() => {
    // 1. Auto Enabled flag (local UI preference, not user data)
    const savedAuto = localStorage.getItem(autoGenStorageKey);
    if (savedAuto !== null) {
      setIsAutoEnabled(savedAuto === "true");
    } else {
      localStorage.setItem(autoGenStorageKey, "true");
      setIsAutoEnabled(true);
    }

    if (!currentUser) {
      setChatMessages([]);
      setDiaryEntries([]);
      return;
    }

    // 2. Chat messages across every conversation, to cluster by day
    getAllUserMessagesByDate(currentUser.id).then(setChatMessages).catch(err => {
      console.warn("[FirebaseSync Diary] Error loading chat history: ", err);
      setChatMessages([]);
    });

    // 3. Diary entries
    getDiaryEntries(currentUser.id).then(setDiaryEntries).catch(err => {
      console.warn("[FirebaseSync Diary] Error loading diary entries: ", err);
      setDiaryEntries([]);
    });
  }, [currentUser, autoGenStorageKey]);

  // Generate the rolling 7 days feed
  const getDaysFeed = () => {
    const list = [];
    const todayStr = new Date().toISOString().split("T")[0];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const id = d.toISOString().split("T")[0];
      
      const formatted = d.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      list.push({ id, formatted });
    }
    return list;
  };

  const daysFeed = getDaysFeed();

  // Get chat messages written on a specific day
  const getDayMessages = (dayId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return chatMessages.filter((m) => {
      if (m.date) {
        return m.date === dayId;
      }
      // Fallback: older messages without date are labeled as today
      return dayId === todayStr;
    });
  };

  // Trigger Diary Generation for a specific day
  const generateDiaryForDay = async (dayId: string, dayFormatted: string) => {
    if (generatingDays[dayId]) return;
    
    // Set synchronous tracking refs to prevent duplicate trigger during async execution blocks
    inProgressRef.current[dayId] = true;
    attemptedRef.current[dayId] = true;

    setGeneralError(null);
    setGeneratingDays(prev => ({ ...prev, [dayId]: true }));

    const dayMsgs = getDayMessages(dayId);
    if (dayMsgs.length === 0) {
      setGeneratingDays(prev => ({ ...prev, [dayId]: false }));
      inProgressRef.current[dayId] = false;
      return;
    }

    // Token check
    const isElite = currentUser?.plan === "elite";
    const currentTokens = currentUser?.tokens !== undefined ? currentUser.tokens : (currentUser?.plan === "premium" ? 2500 : 100);
    
    if (currentUser && !isElite) {
      if (currentTokens < 40) {
        setGeneralError("Tokens insuficientes. Gerar o diário consome 40 tokens. Recarregue tokens em seu perfil.");
        setGeneratingDays(prev => ({ ...prev, [dayId]: false }));
        inProgressRef.current[dayId] = false;
        return;
      }
    }

    try {
      const res = await fetch("/api/diary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: dayMsgs,
          nickname: currentUser ? currentUser.nickname : "visitante",
          date: dayFormatted
        })
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("As mensagens deste dia carregam palavras e conexões grandes demais para o nosso diário. Tente sintonizar um intervalo menor de conversas.");
        }
        throw new Error("Falha na sintonização com o servidor.");
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Não consegui decifrar a resposta do diário. Vamos tentar novamente?");
      }
      if (!data) throw new Error("Resposta nula recebida do diário.");

      let updatedEntries = [...diaryEntries];
      // Filter out existing day entry if any
      updatedEntries = updatedEntries.filter(e => e.id !== dayId);

      const newEntry: DiaryEntry = {
        id: dayId,
        date: dayFormatted,
        content: data.hasSufficientData ? data.content : data.insufficientMessage,
        status: data.hasSufficientData ? "generated" : "insufficient",
        summary: data.hasSufficientData ? data.summary : [],
        intensity: data.hasSufficientData ? data.intensity : 0,
        createdAt: new Date().toISOString()
      };

      // Deduct 40 tokens if not elite and successfully generated
      if (currentUser && !isElite && onUserUpdate) {
        onUserUpdate({
          ...currentUser,
          tokens: Math.max(0, currentTokens - 40)
        });
      }

      updatedEntries.push(newEntry);
      setDiaryEntries(updatedEntries);
      if (currentUser) {
        syncDiaryEntries(currentUser.id, updatedEntries).catch(err => {
          console.warn("[FirebaseSync Diary Gen]: ", err);
        });
      }
    } catch (err: any) {
      console.error(err);
      setGeneralError(`Não foi possível tecer as memórias do dia de hoje (${dayFormatted}). Verifique sua chave API.`);
    } finally {
      setGeneratingDays(prev => ({ ...prev, [dayId]: false }));
      inProgressRef.current[dayId] = false;
    }
  };

  // Auto trigger generation for yesterday & today if enabled and messages exist
  useEffect(() => {
    if (!isAutoEnabled || chatMessages.length === 0) return;

    // Scan feed, check which days have messages but no diary entry yet, and trigger them
    const triggerAutoGenerations = async () => {
      for (const day of daysFeed) {
        const hasEntry = diaryEntries.some(e => e.id === day.id);
        const dayMsgs = getDayMessages(day.id);
        
        // Only trigger if:
        // 1. There are user messages
        // 2. There is no diary entry yet
        // 3. We are not already generating it (checked via state and ref)
        // 4. We haven't already attempted this day in the current mount segment (prevents infinite error retry loops)
        if (
          dayMsgs.length > 0 && 
          !hasEntry && 
          !generatingDays[day.id] && 
          !inProgressRef.current[day.id] && 
          !attemptedRef.current[day.id]
        ) {
          await generateDiaryForDay(day.id, day.formatted);
        }
      }
    };

    triggerAutoGenerations();
  }, [isAutoEnabled, chatMessages, diaryEntries]);

  // Handle Toggle Auto-Gen
  const handleToggleAuto = () => {
    const nextVal = !isAutoEnabled;
    setIsAutoEnabled(nextVal);
    localStorage.setItem(autoGenStorageKey, String(nextVal));
  };

  // Start Editing
  const startEditing = (dayId: string, content: string) => {
    setEditingDayId(dayId);
    setEditContent(content);
  };

  // Close Editing
  const cancelEditing = () => {
    setEditingDayId(null);
    setEditContent("");
  };

  // Save Manual Edit
  const saveManualEdit = (dayId: string, dayFormatted: string) => {
    if (!editContent.trim()) return;

    let updatedEntries = [...diaryEntries];
    const existingIndex = updatedEntries.findIndex(e => e.id === dayId);

    if (existingIndex !== -1) {
      updatedEntries[existingIndex] = {
        ...updatedEntries[existingIndex],
        content: editContent,
        status: "edited", // Marked as manual edit
        createdAt: new Date().toISOString()
      };
    } else {
      updatedEntries.push({
        id: dayId,
        date: dayFormatted,
        content: editContent,
        status: "edited",
        summary: ["Nota pessoal anotada à mão"],
        intensity: 2,
        createdAt: new Date().toISOString()
      });
    }

    setDiaryEntries(updatedEntries);
    if (currentUser) {
      syncDiaryEntries(currentUser.id, updatedEntries).catch(err => {
        console.warn("[FirebaseSync Diary Edit]: ", err);
      });
    }
    setEditingDayId(null);
    setEditContent("");
  };

  // Delete Diary Entry
  const deleteDiaryEntry = (dayId: string) => {
    let updatedEntries = diaryEntries.filter(e => e.id !== dayId);
    setDiaryEntries(updatedEntries);
    if (currentUser) {
      syncDiaryEntries(currentUser.id, updatedEntries).catch(err => {
        console.warn("[FirebaseSync Diary Delete]: ", err);
      });
    }
    setDeleteConfirmDayId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in text-left">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 bg-[#0B0B0B] border border-white/5 rounded-sm immersive-corners">
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-barao-rose">
            Gênese de Memória Emocional
          </p>
          <h2 className="font-serif text-3xl font-light text-white tracking-wide">
            Meu Diário Íntimo
          </h2>
          <p className="font-serif text-xs italic text-zinc-400 max-w-xl">
            O Barão relê os diálogos sussurrados, recolhendo cada fresta de sentimento para tecer uma crônica poética da sua jornada. Uma IA que lembra de você.
          </p>
        </div>

        {/* Configurations Toggle (Geometric Pill) */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between bg-black/60 p-3 rounded-sm border border-white/5">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-barao-rose shrink-0" />
            <div className="text-left leading-none">
              <span className="block text-[9px] uppercase font-mono tracking-wider font-bold text-white">
                Geração Automática
              </span>
              <span className="text-[8px] font-serif italic text-zinc-500">
                {isAutoEnabled ? "Ativada de fundo" : "Pausada de fundo"}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleAuto}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAutoEnabled ? "bg-barao-rose" : "bg-zinc-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                isAutoEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {generalError && (
        <div className="flex items-start gap-2.5 rounded-sm bg-red-950/20 border border-red-900/30 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Guest Warning Badge */}
      {!currentUser && (
        <div className="border border-barao-rose/20 bg-barao-plum/20 p-4 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left transition-all">
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-semibold text-white">
              Sessão Temporária de Visitante
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
              Suas crônicas diárias de hoje estão sintonizadas neste navegador. Faça um cadastro gratuito para garantir que suas memórias e diário permaneçam guardados de forma contínua em seu abrigo pessoal protegido.
            </p>
          </div>
          <button
            onClick={onPromptAuth}
            className="px-4 py-2 bg-transparent border border-barao-rose text-barao-rose text-[10px] uppercase font-mono tracking-wider rounded-sm hover:bg-barao-rose hover:text-black transition-all"
          >
            Sintonizar Abrigo Integral
          </button>
        </div>
      )}

      {/* 7-Day Diary Feed */}
      <div className="space-y-6">
        {daysFeed.map((day) => {
          const entry = diaryEntries.find((e) => e.id === day.id);
          const dayMsgs = getDayMessages(day.id);
          const hasDialogues = dayMsgs.length > 0;
          const isGenerating = generatingDays[day.id];
          const isEditing = editingDayId === day.id;
          const showDeleteConfirm = deleteConfirmDayId === day.id;

          return (
            <div 
              key={day.id}
              className={`bg-[#0F0F0F] rounded-sm border transition-all duration-300 ${
                isEditing 
                  ? "border-barao-rose/50 ring-1 ring-barao-rose/25 bg-[#141312]" 
                  : entry?.status === "insufficient"
                    ? "border-white/5 opacity-80"
                    : "border-white/5 hover:border-barao-rose/15 bg-black/20"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-white/5 bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-sm bg-[#0B0B0B] border border-white/10 flex items-center justify-center text-zinc-400">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm text-white font-medium">
                      {day.formatted}
                    </h4>
                    <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-zinc-500 mt-1">
                      {day.id === new Date().toISOString().split("T")[0] && (
                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse mr-1" />
                      )}
                      ID: {day.id}
                    </span>
                  </div>
                </div>

                {/* Status Badges & Quick Action */}
                <div className="flex items-center gap-2.5 self-end sm:self-auto text-xs">
                  {/* Dialogue count indicators */}
                  {hasDialogues ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-barao-rose/5 border border-barao-rose/15 font-mono text-[8.5px] text-barao-rose"
                      title={`${dayMsgs.length} sussurros hoje`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {dayMsgs.length} Sussurros
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-zinc-950 border border-white/5 font-mono text-[8.5px] text-zinc-600">
                      Silêncio Absoluto
                    </span>
                  )}

                  {/* Status Indicator */}
                  {entry && !isGenerating && (
                    <span className={`px-2 py-0.5 rounded-sm font-mono text-[8px] uppercase tracking-wider ${
                      entry.status === "generated"
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                        : entry.status === "edited"
                          ? "bg-amber-950/40 text-amber-400 border border-amber-500/20"
                          : "bg-rose-950/40 text-rose-300 border border-rose-900/15"
                    }`}>
                      {entry.status === "generated" ? "Refletido por IA" : entry.status === "edited" ? "Anotado à mão" : "Dados escassos"}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {isGenerating ? (
                  /* Generating/Loading Skeleton */
                  <div className="space-y-4 py-3 animate-pulse">
                    <div className="flex items-center gap-2 text-xs font-serif italic text-barao-rose">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin duration-7000" />
                      <span>O Barão está relendo suas memórias e tecendo sua história profunda...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3.5 bg-zinc-900/80 rounded-sm w-full"></div>
                      <div className="h-3.5 bg-zinc-900/80 rounded-sm w-11/12"></div>
                      <div className="h-3.5 bg-zinc-900/80 rounded-sm w-4/5"></div>
                    </div>
                  </div>
                ) : isEditing ? (
                  /* inline manual editor */
                  <div className="space-y-3 animate-fade-in">
                    <label className="block text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-400">
                      Editar crônica do dia {day.formatted}
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Anote suas confidências ou complemente a história do seu dia..."
                      rows={5}
                      className="w-full bg-black/80 border border-barao-rose/30 rounded-sm p-3.5 font-serif text-sm text-zinc-200 leading-relaxed focus:outline-none focus:border-barao-rose"
                    />
                    <div className="flex justify-end gap-2 text-xs uppercase font-mono">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1.5 border border-white/5 rounded-sm text-zinc-400 hover:text-white transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveManualEdit(day.id, day.formatted)}
                        className="px-3.5 py-1.5 bg-barao-rose text-black font-bold rounded-sm hover:bg-barao-gold transition flex items-center gap-1"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Salvar crônica
                      </button>
                    </div>
                  </div>
                ) : showDeleteConfirm ? (
                  /* Custom tender delete confirmation */
                  <div className="p-4 bg-red-950/10 border border-red-900/25 rounded-sm space-y-3 text-center animate-slide-up">
                    <p className="font-serif text-sm text-zinc-300 italic">
                      "Você tem certeza de que deseja apagar a crônica de {day.formatted} de sua memória sagrada?"
                    </p>
                    <div className="flex justify-center gap-3 text-xs uppercase font-mono">
                      <button
                        onClick={() => setDeleteConfirmDayId(null)}
                        className="px-3 py-1 bg-zinc-900 text-zinc-400 rounded-sm hover:text-white"
                      >
                        Manter guardada
                      </button>
                      <button
                        onClick={() => deleteDiaryEntry(day.id)}
                        className="px-3 py-1 bg-red-900/30 text-red-200 rounded-sm border border-red-900/50 hover:bg-red-800/40"
                      >
                        Sim, apagar crônica
                      </button>
                    </div>
                  </div>
                ) : entry ? (
                  /* Render calculated entry page */
                  <div className="space-y-4">
                    {/* Intensity hearts & dynamic emotional badges */}
                    {entry.status !== "insufficient" && entry.intensity && entry.intensity > 0 ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1" title={`Intensidade Emocional: ${entry.intensity}/5`}>
                          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 mr-1.5">
                            Carga Emocional:
                          </span>
                          {[...Array(5)].map((_, idx) => (
                            <Heart 
                              key={idx}
                              className={`h-3 w-3 ${
                                idx < (entry.intensity || 0) 
                                  ? idx + 1 >= 4 
                                    ? "text-barao-rose fill-barao-rose animate-pulse" 
                                    : "text-barao-gold fill-barao-gold"
                                  : "text-zinc-800"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Poetical highlights badging */}
                        {entry.summary && entry.summary.length > 0 && (
                          <div className="hidden sm:flex flex-wrap gap-1.5">
                            {entry.summary.map((sum, sumIdx) => (
                              <span 
                                key={sumIdx} 
                                className="px-1.5 py-0.5 bg-black border border-white/5 rounded-sm font-serif text-[10px] italic text-barao-gold"
                              >
                                &ldquo;{sum}&rdquo;
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* True Entry content body */}
                    <div className="font-serif text-sm md:text-base text-zinc-200 leading-relaxed whitespace-pre-wrap max-w-4xl text-left">
                      {entry.content}
                    </div>

                    {/* Poetic bullets visible inside mobile or in simple grid */}
                    {entry.status !== "insufficient" && entry.summary && entry.summary.length > 0 && (
                      <div className="sm:hidden space-y-1 bg-black/40 p-3 border border-white/5 rounded-sm text-left">
                        <span className="block text-[8px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Destaques:</span>
                        {entry.summary.map((sum, sumIdx) => (
                          <p key={sumIdx} className="font-serif text-[10.5px] italic text-barao-gold">
                            • "{sum}"
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Operational controls footer */}
                    <div className="flex justify-between items-center bg-black/25 px-3 py-2 border border-white/5 rounded-sm text-xs font-mono uppercase tracking-wider text-zinc-500">
                      <span className="text-[8px] text-zinc-650">
                        Último registro: {new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        {hasDialogues && (
                          <button
                            onClick={() => generateDiaryForDay(day.id, day.formatted)}
                            className="hover:text-barao-rose flex items-center gap-1 relative duration-200"
                            title="Refazer a leitura dos diálogos desse dia"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Regerar</span>
                          </button>
                        )}
                        <button
                          onClick={() => startEditing(day.id, entry.content)}
                          className="hover:text-white flex items-center gap-1 duration-200"
                        >
                          <Edit3 className="h-3 w-3 text-barao-rose" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmDayId(day.id)}
                          className="hover:text-red-400 flex items-center gap-1 duration-200"
                        >
                          <Trash2 className="h-3 w-3 text-red-500/85" />
                          <span>Apagar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty / Untouched Day Row */
                  <div className="py-6 text-center space-y-4">
                    {hasDialogues ? (
                      /* Active but not generated */
                      <div className="space-y-3 max-w-lg mx-auto">
                        <p className="font-serif text-xs text-zinc-400 italic">
                          "Suas memórias de {day.formatted} estão flutuando soltas. Vamos sintonizá-las em um registro de diário profundo?"
                        </p>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEditing(day.id, "")}
                            className="px-3.5 py-1.5 border border-white/10 rounded-sm text-[9.5px] uppercase font-mono tracking-wider hover:border-barao-rose text-zinc-300 bg-black duration-250 flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            Anotar à mão
                          </button>
                          <button
                            onClick={() => generateDiaryForDay(day.id, day.formatted)}
                            className="px-4 py-1.5 bg-barao-rose text-black font-bold rounded-sm text-[9.5px] uppercase font-mono tracking-wider hover:bg-barao-gold duration-250 flex items-center gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Tecê-lo com IA
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Silent Day */
                      <div className="space-y-2.5 max-w-md mx-auto">
                        <p className="font-serif text-xs text-zinc-500 italic">
                          Você esteve longe de mim neste dia ou permaneceu no silêncio do espírito. Não há conexões suficientes para erigir uma crônica emocional automática.
                        </p>
                        <button
                          onClick={() => startEditing(day.id, "")}
                          className="inline-flex items-center gap-1.5 text-[9px] uppercase font-mono tracking-widest text-[#CB8684] hover:text-white duration-250"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Anotar Algo à Mão
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
