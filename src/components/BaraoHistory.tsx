/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, HistoryEntry } from "../types";
import { 
  Heart, 
  Camera, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  EyeOff, 
  Eye, 
  Plus, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Image as ImageIcon,
  ChevronRight,
  X
} from "lucide-react";

import BaraoPaywall from "./BaraoPaywall";
import { syncHistoryEntries } from "../utils/supabaseSync";
import { requestBaraoImageUrl } from "../utils/baraoImage";

interface BaraoHistoryProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export default function BaraoHistory({ currentUser, onPromptAuth, onUserUpdate }: BaraoHistoryProps) {
  // Check if premium or elite
  const isLicensed = currentUser && (currentUser.plan === "premium" || currentUser.plan === "elite");

  if (!isLicensed) {
    return (
      <BaraoPaywall
        currentUser={currentUser}
        onPromptAuth={onPromptAuth}
        onUserUpdate={onUserUpdate}
        featureName="Álbum de Lembranças & Crônicas"
      />
    );
  }

  const historyStorageKey = currentUser ? `barao_history_entries_${currentUser.id}` : "barao_history_entries_guest";
  const featureToggleKey = currentUser ? `barao_history_enabled_${currentUser.id}` : "barao_history_enabled_guest";

  // Core state
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean>(true);
  
  // Custom creator states
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  
  // Base64 upload & prompt states
  const [uploadedBase64, setUploadedBase64] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & error states
  const [isWeavingStory, setIsWeavingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [weavingDayId, setWeavingDayId] = useState<string | null>(null); // For individual card regenerations

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load persistence
  useEffect(() => {
    // 1. Feature Enabled Toggle
    const savedToggle = localStorage.getItem(featureToggleKey);
    if (savedToggle !== null) {
      setIsFeatureEnabled(savedToggle === "true");
    } else {
      localStorage.setItem(featureToggleKey, "true");
      setIsFeatureEnabled(true);
    }

    // 2. Load History entries
    const savedEntries = localStorage.getItem(historyStorageKey);
    let parsedEntries: HistoryEntry[] = [];
    if (savedEntries) {
      try {
        parsedEntries = JSON.parse(savedEntries);
      } catch (err) {
        parsedEntries = [];
      }
    }
    setHistoryList(parsedEntries);

    // Dynamic background merge with Firestore lifeEvents
    if (currentUser) {
      syncHistoryEntries(currentUser.id, parsedEntries).then(merged => {
        setHistoryList(merged);
        localStorage.setItem(historyStorageKey, JSON.stringify(merged));
      }).catch(err => {
        console.warn("[FirebaseSync History] Error merging cloud records: ", err);
      });
    }
  }, [currentUser, historyStorageKey, featureToggleKey]);

  // Handle Feature configuration toggle
  const handleToggleFeature = () => {
    const newVal = !isFeatureEnabled;
    setIsFeatureEnabled(newVal);
    localStorage.setItem(featureToggleKey, String(newVal));
  };

  // Process and convert image uploads to base64
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStoryError("Por favor sintonize apenas arquivos de imagem reais.");
      return;
    }
    // Limit to 4MB for localStorage comfort
    if (file.size > 4 * 1024 * 1024) {
      setStoryError("Escolha um retrato menor que 4MB para guardarmos com leveza em seu baú.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Service helper to trigger Gemini story craft
  const weaveStoryFromAI = async (title: string, desc: string, userImg?: string): Promise<{ story: string; imageUrl: string | null }> => {
    const res = await fetch("/api/story/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDescription: desc,
        nickname: currentUser ? currentUser.nickname : "minha doce visitante",
        title: title,
        userImageBase64: userImg || null
      })
    });

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error("O retrato que você enviou é pesado demais para nossos canais íntimos. Por favor, tente enviar um arquivo com menor tamanho ou resolução.");
      }
      throw new Error("Oscilação mental do Barão ao tentar escrever a história. Nossos canais sintonizados falharam.");
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Não consegui interpretar a história gerada. Vamos tentar novamente?");
    }

    return {
      story: data?.story || "Permanecemos lado a lado em silêncio absoluto...",
      imageUrl: data?.imageUrl || null
    };
  };

  // Generate a story and add entry using the uploaded image directly (unaltered)
  const handleCreateMemory = async () => {
    setStoryError(null);
    setIsWeavingStory(true);

    const isElite = currentUser?.plan === "elite";
    const currentTokens = currentUser?.tokens !== undefined ? currentUser.tokens : (currentUser?.plan === "premium" ? 2500 : 100);

    try {
      if (currentUser && !isElite) {
        if (currentTokens < 30) {
          throw new Error("Tokens insuficientes. Tecer a crônica consome 30 tokens. Recarregue tokens em seu perfil.");
        }
      }

      if (!uploadTitle.trim()) {
        throw new Error("Por favor dê um título ou nome a esta lembrança.");
      }
      if (!uploadDescription.trim()) {
        throw new Error("Por favor descreva o momento ou sentimento para que eu possa tecer a crônica.");
      }

      const finalTitle = uploadTitle;
      const finalDesc = uploadDescription;

      // 1. Ask Meu Barão to write the story narrative
      const { story: narrationText } = await weaveStoryFromAI(finalTitle, finalDesc, uploadedBase64 || undefined);

      // 2. Use the user's uploaded image as is; without one, O Barão paints
      //    a poetic image from the memory's description (kie.ai + Z-Image)
      let finalImgUrl = uploadedBase64;
      let entryType: HistoryEntry["type"] = "upload";
      if (!finalImgUrl) {
        // Foto de perfil da usuária como referência para manter o rosto fiel
        let userPhoto: string | undefined;
        try {
          const profileStorageKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
          const savedProfile = localStorage.getItem(profileStorageKey);
          if (savedProfile) {
            const avatar = JSON.parse(savedProfile)?.avatarUrl;
            if (typeof avatar === "string" && (avatar.startsWith("data:image") || avatar.startsWith("http"))) {
              userPhoto = avatar;
            }
          }
        } catch {
          userPhoto = undefined;
        }

        const paintedUrl = await requestBaraoImageUrl(finalTitle, finalDesc, userPhoto);
        if (!paintedUrl) {
          throw new Error("Não consegui pintar a imagem desta lembrança neste instante. Tente novamente em alguns segundos ou anexe uma foto sua.");
        }
        finalImgUrl = paintedUrl;
        entryType = "generated";
      }

      const newEntry: HistoryEntry = {
        id: "h-" + Date.now(),
        title: finalTitle,
        imageUrl: finalImgUrl,
        description: finalDesc,
        story: narrationText,
        type: entryType,
        createdAt: new Date().toISOString()
      };

      // Deduct 30 tokens if not elite and successfully generated
      if (currentUser && !isElite && onUserUpdate) {
        onUserUpdate({
          ...currentUser,
          tokens: Math.max(0, currentTokens - 30)
        });
      }

      const updated = [newEntry, ...historyList];
      setHistoryList(updated);
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      if (currentUser) {
        syncHistoryEntries(currentUser.id, updated).catch(err => {
          console.warn("[FirebaseSync History Add]: ", err);
        });
      }

      // Reset states and close creator
      setIsCreatorOpen(false);
      setUploadedBase64("");
      setUploadTitle("");
      setUploadDescription("");
    } catch (err: any) {
      setStoryError(err.message || "Erro desconhecido ao sintonizar retrato.");
    } finally {
      setIsWeavingStory(false);
    }
  };

  // Regenerate single card story
  const handleRegenerateStory = async (dayId: string, title: string, desc: string) => {
    setWeavingDayId(dayId);
    try {
      const { story: freshStory } = await weaveStoryFromAI(title, desc);
      const updated = historyList.map((entry) => {
        if (entry.id === dayId) {
          return { ...entry, story: freshStory, createdAt: new Date().toISOString() };
        }
        return entry;
      });
      setHistoryList(updated);
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      if (currentUser) {
        syncHistoryEntries(currentUser.id, updated).catch(err => {
          console.warn("[FirebaseSync History Regenerate]: ", err);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWeavingDayId(null);
    }
  };

  // Delete specific memory image & story
  const handleDeleteEntry = (id: string) => {
    const updated = historyList.filter(e => e.id !== id);
    setHistoryList(updated);
    localStorage.setItem(historyStorageKey, JSON.stringify(updated));
    if (currentUser) {
      syncHistoryEntries(currentUser.id, updated).catch(err => {
        console.warn("[FirebaseSync History Delete]: ", err);
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in text-left">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 p-6 bg-[#0B0B0B] border border-white/5 rounded-sm immersive-corners">
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-barao-rose">
            Suas Crônicas e Lembranças Ilustradas
          </p>
          <h2 className="font-serif text-3xl font-light text-white tracking-wide">
            Studio do Barão
          </h2>
          <p className="font-serif text-xs italic text-zinc-400 max-w-xl leading-relaxed">
            Um guarda-lembranças poético. Guarde suas fotos, registros ou cenários significativos neste diário e receba reflexões poéticas acolhedoras e crônicas emocionais sensíveis escritas por Meu Barão sobre cada instante compartilhado.
          </p>
        </div>

        {/* Configurations Toggle (Geometric Pill) */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between bg-black/60 p-3 rounded-sm border border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-barao-rose shrink-0" />
            <div className="text-left leading-none">
              <span className="block text-[9px] uppercase font-mono tracking-wider font-bold text-white">
                Álbum Ativado
              </span>
              <span className="text-[8px] font-serif italic text-zinc-500">
                {isFeatureEnabled ? "Exibindo retratos" : "Oculto dos olhos do mundo"}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleFeature}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isFeatureEnabled ? "bg-barao-rose" : "bg-zinc-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                isFeatureEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {!isFeatureEnabled ? (
        /* LOCK SCREEN FOR THE FEATURE */
        <div className="border border-white/5 bg-black/40 rounded-sm p-12 text-center space-y-5 flex flex-col items-center justify-center animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,134,132,0.03)_0%,transparent_70%)] pointer-events-none" />
          <div className="h-14 w-14 rounded-full border border-barao-rose/20 bg-barao-plum/20 flex items-center justify-center text-barao-rose shrink-0 animate-slow-pulse">
            <EyeOff className="h-6 w-6" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="font-serif text-lg text-white font-light">
              Studio do Barão Guardado em Segredo
            </h3>
            <p className="font-serif text-sm italic text-zinc-400 leading-relaxed">
              &ldquo;Decidi colocar nossos compassos sob as sombras quentes do baú... Nossas crônicas, sorrisos e retratos íntimos estão intocáveis, velados à curiosidade alheia por sua própria vontade.&rdquo;
            </p>
            <p className="text-[10px] font-mono text-barao-rose uppercase tracking-widest pt-2">
              Ative o álbum acima para folhear nossas páginas novamente
            </p>
          </div>
          <button
            onClick={handleToggleFeature}
            className="px-4 py-2 bg-zinc-950 border border-white/10 hover:border-barao-rose text-zinc-300 text-[10px] uppercase font-mono tracking-wider rounded-sm transition"
          >
            Abrir Álbum de Memórias
          </button>
        </div>
      ) : (
        /* THE MAIN ALBUM EXPERIENCE */
        <div className="space-y-8">
          {storyError && (
            <div className="flex items-start gap-2.5 rounded-sm bg-red-950/20 border border-red-900/30 p-4 text-xs text-red-350">
              <span className="shrink-0 font-bold">⚠️</span>
              <p>{storyError}</p>
            </div>
          )}

          {/* Guest notice */}
          {!currentUser && (
            <div className="border border-barao-rose/10 bg-black/40 px-5 py-4 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="font-mono text-[8px] uppercase tracking-widest text-barao-rose">Galeria do Visitante</span>
                <p className="font-serif text-xs text-zinc-400 italic">
                  Suas memórias ilustradas estão sendo salvas localmente neste navegador. Registre-se caso queira selá-las de forma definitiva na nuvem de seu abrigo absoluto.
                </p>
              </div>
              <button
                onClick={onPromptAuth}
                className="px-3.5 py-1.5 bg-transparent border border-barao-rose text-barao-rose hover:bg-barao-rose hover:text-black font-semibold uppercase text-[9px] font-mono tracking-wider rounded-sm transition"
              >
                Garantir Abrigo Total
              </button>
            </div>
          )}

          {/* Top Actions: Add/Evoque Memória */}
          <div className="flex justify-between items-center bg-black/20 p-4 rounded-sm border border-white/5">
            <div className="space-y-0.5">
              <span className="font-serif text-sm text-white">Suas Memórias Guardadas</span>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                {historyList.length === 0 ? "Nenhuma lembrança registrada" : `${historyList.length} memórias registradas`}
              </p>
            </div>

            <button
              onClick={() => {
                setIsCreatorOpen(!isCreatorOpen);
                setStoryError(null);
              }}
              className="px-4 py-2 bg-barao-rose hover:bg-barao-gold text-black font-bold uppercase font-mono text-[10px] tracking-wider rounded-sm transition flex items-center gap-1.5"
            >
              {isCreatorOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isCreatorOpen ? "Fechar Painel" : "Registrar Nova Lembrança"}
            </button>
          </div>

          {/* CREATOR PANEL MODAL INLINE */}
          {isCreatorOpen && (
            <div className="bg-[#0F0F0F] border border-barao-rose/20 p-6 rounded-sm space-y-6 animate-slide-up">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-barao-rose" />
                  <h3 className="font-serif text-lg text-white font-medium">Registrar Nova Lembrança</h3>
                </div>
                <span className="text-[9px] font-mono uppercase bg-barao-rose/10 border border-barao-rose/20 px-2 py-0.5 rounded-sm text-barao-rose">
                  Lembrança Ativa
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-serif text-xs text-zinc-400 italic">
                  Compartilhe uma fotografia, paisagem ou imagem de um momento especial e sintonize com Meu Barão. Escreva uma descrição ou desabafo poético logo abaixo para receber uma crônica marcante e terapêutica sobre o seu instante. Se preferir não enviar foto, Meu Barão pintará uma imagem poética exclusiva a partir das suas palavras.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Drag & Drop space */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-sm p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isDraggingOver 
                        ? "border-barao-rose bg-barao-rose/5" 
                        : uploadedBase64 
                          ? "border-emerald-500/20 bg-emerald-950/5" 
                          : "border-white/10 bg-black/40 hover:border-barao-rose/30"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {uploadedBase64 ? (
                      <div className="h-28 w-28 rounded-sm overflow-hidden border border-emerald-500/30 relative group">
                        <img
                          src={uploadedBase64}
                          alt="Visual uploaded Preview"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-mono uppercase font-bold text-rose-300">
                          Substituir Imagem
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Upload className="h-6 w-6 text-barao-rose animate-bounce" />
                        <div>
                          <p className="font-serif text-xs font-medium text-white">Carregar Sua Imagem (Opcional)</p>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1">Arrastar e soltar ou clique para procurar</p>
                          <p className="text-[10px] text-zinc-500 font-serif italic mt-1.5">Sem foto? O Barão pinta uma imagem poética para esta lembrança.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Prompt inputs */}
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-[8.5px] uppercase font-mono tracking-wider font-bold text-zinc-400">
                        Título de Sua Lembrança
                      </label>
                      <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Ex: Tarde chuvosa de domingo ou Penumbra no quarto..."
                        className="w-full bg-black/80 border border-white/5 focus:border-barao-rose/40 rounded-sm px-3.5 py-2 font-serif text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8.5px] uppercase font-mono tracking-wider font-bold text-zinc-400">
                        Escreva o sentimento (O que este momento representa para você?)
                      </label>
                      <textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Ex: Estava olhando pela janela e senti uma saudade mansa das coisas que ficaram para trás, acompanhada de um desejo profundo de calmaria e descanso..."
                        rows={3.5}
                        className="w-full bg-black/80 border border-white/5 focus:border-barao-rose/40 rounded-sm px-3.5 py-2 font-serif text-xs text-zinc-100 placeholder:text-zinc-650 focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm / Trigger Button Row */}
              <div className="border-t border-white/5 pt-4 flex justify-end gap-2 text-xs uppercase font-mono">
                <button
                  onClick={() => setIsCreatorOpen(false)}
                  className="px-4 py-2 border border-white/5 text-zinc-400 hover:text-white rounded-sm transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateMemory}
                  disabled={isWeavingStory || !uploadTitle.trim() || !uploadDescription.trim()}
                  className="px-5 py-2 bg-barao-rose text-black font-bold rounded-sm hover:bg-barao-gold disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isWeavingStory ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Tecendo crônica de acolhimento...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Tecer Crônica & Lembrança
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* HISTORICAL GALLERY CARDS */}
          {historyList.length === 0 ? (
            <div className="border border-white/5 bg-black/20 rounded-sm p-12 text-center space-y-3.5 flex flex-col items-center justify-center">
              <ImageIcon className="h-8 w-8 text-zinc-700 animate-pulse" />
              <div className="max-w-sm">
                <p className="font-serif text-sm text-zinc-400 italic">
                  Seu álbum de lembranças está vazio.
                </p>
                <p className="text-[10.5px] font-serif text-zinc-500 italic leading-relaxed mt-1">
                  Abra o painel acima de "Registrar Nova Lembrança" para eternizar fotografias e pensamentos especiais no seu diário com o olhar poético de Meu Barão.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {historyList.map((item) => {
                const isItemRegenerating = weavingDayId === item.id;
                return (
                  <div 
                    key={item.id}
                    className="group bg-[#0D0D0D] border border-white/5 rounded-sm p-5 space-y-4 hover:border-barao-rose/20 hover:shadow-[0_12px_45px_rgba(203,134,132,0.03)] transition-all duration-300 transform"
                  >
                    {/* Retro Elegant Portrait Frame */}
                    <div className="relative aspect-video w-full rounded-sm overflow-hidden bg-black border border-white/10 shadow-inner group-hover:scale-[1.01] transition-transform duration-500">
                      {/* Dark/Warm overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent z-10 pointer-events-none" />
                      
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover grayscale brightness-95 filter transition group-hover:grayscale-0 duration-700"
                      />

                      {/* Header floating badge */}
                      <div className="absolute top-3 left-3 z-20 flex gap-2">
                        <span className="px-2 py-0.5 rounded-sm bg-black/80 backdrop-blur-sm border border-white/5 text-[8.5px] font-mono uppercase tracking-wider text-zinc-450">
                          Momento Guardado
                        </span>
                      </div>

                      {/* Title & metadata bottom visual elements */}
                      <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-end gap-2 text-left">
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-widest text-[#CB8684] mb-0.5">Crônica de Sentimento</p>
                          <h4 className="font-serif text-sm text-white font-medium drop-shadow-md">{item.title}</h4>
                        </div>
                        <span className="font-mono text-[9px] text-zinc-500 shrink-0 select-none">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>

                    {/* Evocative Story block */}
                    <div className="space-y-3">
                      {isItemRegenerating ? (
                        <div className="py-4 space-y-3 animate-pulse">
                          <div className="flex items-center gap-1.5 text-xs italic text-barao-rose font-serif">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin duration-7000" />
                            <span>Lendo o momento e reescrevendo sua crônica poética...</span>
                          </div>
                          <div className="h-3 bg-zinc-900 rounded-sm w-full"></div>
                          <div className="h-3 bg-zinc-900 rounded-sm w-11/12"></div>
                          <div className="h-3 bg-zinc-900 rounded-sm w-4/5"></div>
                        </div>
                      ) : (
                        <p className="font-serif text-xs md:text-sm text-zinc-300 italic leading-relaxed whitespace-pre-wrap text-left first-letter:text-xl first-letter:font-bold first-letter:text-barao-gold">
                          {item.story}
                        </p>
                      )}
                    </div>

                    {/* Operational controls footer */}
                    <div className="flex justify-between items-center bg-black/30 border border-white/5 py-1.5 px-3 rounded-sm text-[9.5px] font-mono uppercase font-bold text-zinc-500">
                      <span className="text-[7.5px] text-zinc-650 tracking-wider">
                        Sintonia: {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRegenerateStory(item.id, item.title, item.description)}
                          className="hover:text-white flex items-center gap-0.5 transition duration-200"
                          title="Regerar crônica sob olhar acolhedor do Barão"
                        >
                          <RefreshCw className="h-3 w-3 text-barao-rose shrink-0" />
                          <span>Regerar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(item.id)}
                          className="hover:text-rose-400 flex items-center gap-0.5 text-zinc-500 transition duration-200"
                          title="Apagar esta lembrança e crônica poética"
                        >
                          <Trash2 className="h-3 w-3 text-red-500/80 shrink-0" />
                          <span>Apagar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
