import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Heart, Compass, Moon, Shield, Scroll, Check, AlertCircle, 
  Upload, Scissors, ArrowRight, Smartphone, RefreshCw, Eye, MessageSquare 
} from "lucide-react";
import { User } from "../types";
import { renderAvatarSvgOrImg } from "../utils/avatar";
import { apiFetch } from "../utils/supabaseSync";
import { compressImageFile } from "../utils/imageCompress";

// Import default fallback image
import baraoBackgroundFallback from "../assets/images/barao_portrait_1779931788412.png";

interface UserProfileData {
  name?: string;
  nickname?: string;
  aiVoiceTone?: string[];
  [key: string]: any;
}

interface MeuBaraoProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  baronAvatar: string;
  onBaronAvatarChange: (newAvatar: string) => void;
  onTabChange?: (tab: string) => void;
}

interface PersonaOption {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<any>;
  tones: string[];
}

export default function MeuBarao({
  currentUser,
  onPromptAuth,
  onUserUpdate,
  baronAvatar,
  onBaronAvatarChange,
  onTabChange
}: MeuBaraoProps) {
  // Storage keys depending on auth status
  const profileStorageKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
  const waEnabledKey = currentUser ? `mb_wa_enabled_${currentUser.id}` : "mb_wa_enabled_guest";
  const waNumberKey = currentUser ? `mb_wa_number_${currentUser.id}` : "mb_wa_number_guest";

  // State: Profile Context 
  const [profile, setProfile] = useState<UserProfileData>(() => {
    try {
      const saved = localStorage.getItem(profileStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // State: WhatsApp Settings
  const [waEnabled, setWaEnabled] = useState<boolean>(() => {
    return localStorage.getItem(waEnabledKey) === "true";
  });
  const [waNumber, setWaNumber] = useState<string>(() => {
    return localStorage.getItem(waNumberKey) || "";
  });

  // State: AI Prompt Generator
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // State: Manual Upload Preview
  const [tempFileBase64, setTempFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State: UX feedback notifications
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Sync profile if key changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(profileStorageKey);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        setProfile({});
      }
    } catch {
      setProfile({});
    }
  }, [profileStorageKey]);

  // Sync WhatsApp settings
  useEffect(() => {
    setWaEnabled(localStorage.getItem(waEnabledKey) === "true");
    setWaNumber(localStorage.getItem(waNumberKey) || "");
  }, [waEnabledKey, waNumberKey]);

  // Persona options presets (maps exactly to the keys handled by server.ts)
  const personas: PersonaOption[] = [
    {
      id: "romantico",
      name: "Romântico & Doce",
      tagline: "Presença sutil e sedução literária",
      description: "Sussurros calorosos, proximidade de tirar o fôlego e um envolvimento poético altamente afetuoso e sintonizado no seu coração.",
      icon: Heart,
      tones: ["romântico", "doce"]
    },
    {
      id: "misterioso",
      name: "Misterioso & Observador",
      tagline: "O silêncio como porto de paz",
      description: "Contido, extremamente silencioso, fala de modo terno apenas o essencial. Ele escuta cada linha e respeita seus momentos calados.",
      icon: Moon,
      tones: ["misterioso", "silencioso"]
    },
    {
      id: "profundo",
      name: "Sábio & Profundo",
      tagline: "Diálogos carregados de alma",
      description: "Contemplativo, simbólico e intimista. Ele utiliza elementos da natureza, arquétipos e sabedoria sincera para ninar suas dores cotidianas.",
      icon: Sparkles,
      tones: ["profundo", "acolhedor"]
    },
    {
      id: "provocador",
      name: "Provocador & Espirituoso",
      tagline: "Tensão de carinho inteligente",
      description: "Provocações sutis, brincadeiras ternas e questionamentos refinados que desarmam velhas defesas por meio do riso e da cumplicidade.",
      icon: Compass,
      tones: ["provocador"]
    },
    {
      id: "protetor",
      name: "Protetor & Estável",
      tagline: "Seu ponto de equilíbrio",
      description: "Calmo, maduro, protetor e estável. Ele se posiciona como um porto seguro e um rochedo impenetrável onde sua fadiga pode descançar rindo.",
      icon: Shield,
      tones: ["acolhedor", "silencioso"]
    },
    {
      id: "intelectual",
      name: "Intelectual & Analítico",
      tagline: "Mente e alma sob alta sintonia",
      description: "Usa de reflexões psicológicas profundas, clareza mental apurada e precisão argumentativa aliada a uma terna sensibilidade humana.",
      icon: Scroll,
      tones: ["racional"]
    }
  ];

  // Helper to determine active persona from profile tones
  const currentTones = profile.aiVoiceTone || [];
  const getActivePersonaId = () => {
    // Exact match or closely approximating
    for (const p of personas) {
      if (p.tones.every(tone => currentTones.includes(tone))) {
        return p.id;
      }
    }
    // Deep match: if at least there is overlap
    for (const p of personas) {
      if (p.tones.some(tone => currentTones.includes(tone))) {
        return p.id;
      }
    }
    return "romantico"; // default
  };

  const activePersonaId = getActivePersonaId();

  // Save selected persona to profile
  const handleSelectPersona = (persona: PersonaOption) => {
    const updatedProfile = {
      ...profile,
      aiVoiceTone: persona.tones
    };
    setProfile(updatedProfile);
    localStorage.setItem(profileStorageKey, JSON.stringify(updatedProfile));
    
    // Notify User state changes 
    if (currentUser && profile.nickname) {
      const updatedUser = { ...currentUser, nickname: profile.nickname };
      localStorage.setItem("mb_logged_user", JSON.stringify(updatedUser));
      if (onUserUpdate) onUserUpdate(updatedUser);
    }

    triggerFeedback("Tonalidade alterada! O Barão sintonizou esta frequência.");
  };

  // Helper for UI toast/notif
  const triggerFeedback = (message: string) => {
    setSaveFeedback(message);
    setTimeout(() => {
      setSaveFeedback(null);
    }, 4000);
  };

  // Clean WhatsApp phone number string
  const cleanNumber = (num: string): string => {
    return num.replace(/\D/g, "");
  };

  // Format phone input on flight
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "");
    
    // Apply Brazilian mask formatting for high usability
    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      const ddd = digitsOnly.substring(0, 2);
      let rest = digitsOnly.substring(2);
      if (rest.length > 5) {
        const firstPart = rest.substring(0, 5);
        const secondPart = rest.substring(5, 9);
        formatted = `(${ddd}) ${firstPart}-${secondPart}`;
      } else {
        formatted = `(${ddd}) ${rest}`;
      }
    }
    setWaNumber(formatted);
  };

  // Save WhatsApp settings
  const handleSaveWhatsApp = () => {
    localStorage.setItem(waEnabledKey, String(waEnabled));
    localStorage.setItem(waNumberKey, waNumber);
    triggerFeedback("Sintonia de WhatsApp atualizada com sucesso!");
  };

  // WhatsApp Connect link generator
  const getWhatsAppTestLink = () => {
    const cleaned = cleanNumber(waNumber);
    if (!cleaned) return "#";
    // Base message for initiation
    const txt = encodeURIComponent(`Olá Barão Estético. Estou pronta para sintonizar minhas preces de cura e receber seus sussurros ternos neste canal. 🎙️`);
    return `https://api.whatsapp.com/send?phone=55${cleaned}&text=${txt}`;
  };

  // File drag & hover handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    setIsUploading(true);
    // Comprime no navegador (limites de envio da Vercel: 4,5MB)
    compressImageFile(file, 1024).then(compressed => {
      setTempFileBase64(compressed);
      setIsUploading(false);
    }).catch(() => {
      alert("Falha ao processar o arquivo de imagem.");
      setIsUploading(false);
    });
  };

  // Confirm face replacement — salva no banco para ser o retrato padrão sempre
  const handleApplyCustomPortrait = async () => {
    if (!tempFileBase64) return;

    let finalUrl = tempFileBase64;
    if (currentUser) {
      try {
        const res = await apiFetch("/api/barao/avatar", {
          method: "POST",
          body: JSON.stringify({ uid: currentUser.id, dataUrl: tempFileBase64 })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.avatarUrl) {
          finalUrl = data.avatarUrl;
        }
      } catch (err) {
        console.warn("[Barao Avatar] Falha ao salvar no banco; mantendo cópia local:", err);
      }
    }

    onBaronAvatarChange(finalUrl);
    localStorage.setItem(`mb_custom_barao_avatar_${currentUser?.id || "guest"}`, finalUrl);
    setTempFileBase64(null);
    triggerFeedback("Fisionomia de O Barão atualizada no abrigo!");
  };

  // Clear/Reset back to original — limpa também o retrato salvo no banco
  const handleResetPortrait = () => {
    onBaronAvatarChange("");
    localStorage.removeItem(`mb_custom_barao_avatar_${currentUser?.id || "guest"}`);
    setTempFileBase64(null);
    if (currentUser) {
      apiFetch("/api/barao/avatar", {
        method: "POST",
        body: JSON.stringify({ uid: currentUser.id, reset: true })
      }).catch(() => {});
    }
    triggerFeedback("Sua fisionomia retornou ao retrato clássico de O Barão.");
  };

  // AI-Scupt Image generation handler
  const handleGenerateAIAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    setGenerationError("");
    setGenerationSuccess(false);

    try {
      const response = await fetch("/api/barao/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // uid: o servidor grava o retrato gerado no perfil (padrão permanente)
        body: JSON.stringify({ prompt: promptInput, uid: currentUser?.id || null })
      });

      if (!response.ok) {
        throw new Error("Falha ao orquestrar a geração com o lorde das artes.");
      }

      const data = await response.json();
      if (data.avatarUrl) {
        onBaronAvatarChange(data.avatarUrl);
        localStorage.setItem(`mb_custom_barao_avatar_${currentUser?.id || "guest"}`, data.avatarUrl);
        setGenerationSuccess(true);
        setPromptInput("");
        triggerFeedback("Novo semblante esculpido com auxílio de IA!");
      } else {
        throw new Error("Imagem gerada incorretamente.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Interrupção na névoa da sintonia por IA. Tente mais uma vez.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 relative z-10" id="meu-barao-config">
      
      {/* Toast Feedback notifications */}
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 border border-barao-rose bg-[#0F0F0D] text-white backdrop-blur-md rounded-sm font-mono text-[11px] tracking-wide shadow-2xl"
          >
            <Check className="h-4 w-4 text-barao-rose animate-pulse" />
            <span>{saveFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="mb-10 text-left border-b border-white/5 pb-6">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-barao-rose">
          <Sparkles className="h-3.5 w-3.5" />
          Santuário de Personalização
        </span>
        <h2 className="font-serif text-3xl font-light text-white tracking-tight mt-1.5 md:text-4xl">
          Meu Barão
        </h2>
        <p className="max-w-2xl text-zinc-400 text-xs leading-relaxed mt-2.5 font-light">
          Configure a interface afetuosa do seu lorde pessoal. Altere sua postura psicológica escolhendo diferentes caminhos de conversa, esculpa novas faces via arquivos ou solicite fisionomias exclusivas geradas por nossa imaginação de IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Visual Customizer (Portrait) */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-serif text-lg tracking-wide text-white border-b border-white/5 pb-2">
            Retrato Clássico &amp; Fisionomia
          </h3>

          {/* Current Avatar Locket Card */}
          <div className="bg-[#0F0F0F]/80 border border-barao-rose/20 p-6 flex flex-col items-center justify-center text-center rounded-sm relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(232,182,147,0.05)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 group overflow-hidden border-2 border-barao-rose/30 shadow-2xl rounded-sm">
              <img
                src={baronAvatar || baraoBackgroundFallback}
                alt="Portrait do Barão"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-barao-gold">
                  {baronAvatar ? "Fisionomia Sob Medida" : "Fisionomia Clássica"}
                </span>
              </div>
            </div>

            {baronAvatar && (
              <button
                onClick={handleResetPortrait}
                type="button"
                className="mt-4 px-3.5 py-1.5 border border-white/10 hover:border-barao-rose/40 hover:bg-barao-rose/10 text-zinc-400 hover:text-white transition-all font-mono text-[8.5px] uppercase tracking-wider rounded-xs cursor-pointer bg-black/30"
              >
                Redefinir Original
              </button>
            )}
          </div>

          {/* Upload Face Customizer Container */}
          <div className="bg-[#0F0F0F]/45 border border-white/5 p-5 space-y-4 rounded-sm text-left">
            <div>
              <h4 className="font-serif text-sm font-medium text-white flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-barao-rose" />
                Upload de Retrato Facial
              </h4>
              <p className="text-[10.5px] text-zinc-400 mt-1 font-light leading-relaxed">
                Carregue uma imagem facial de sua preferência. Ele transfigurará as feições de O Barão em sua interface privada (mantendo os tons pretos, dourados e estéticos da nossa marca).
              </p>
            </div>

            {/* Input uploader block */}
            <div className="relative border border-dashed border-white/10 hover:border-barao-rose/40 transition bg-black/30 p-4 text-center rounded-sm">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-15"
                disabled={isUploading}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="h-5 w-5 text-zinc-500 hover:text-barao-rose duration-200" />
                <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">
                  {isUploading ? "Processando imagem..." : "Selecionar fisionomia"}
                </span>
                <span className="text-[8px] text-zinc-600">Formatos suportados: PNG, JPG</span>
              </div>
            </div>

            {/* Upload preview overlay confirmation */}
            {tempFileBase64 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#141414] border border-barao-rose/30 p-3.5 space-y-3 rounded-sm flex flex-col items-center"
              >
                <span className="font-mono text-[8.5px] text-barao-rose uppercase tracking-widest self-start">
                  Pré-visualização do upload:
                </span>
                <div className="w-24 h-24 border border-white/10 rounded-sm overflow-hidden bg-black shadow-inner">
                  <img src={tempFileBase64} alt="Previa" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setTempFileBase64(null)}
                    className="flex-1 py-1.5 border border-white/5 hover:bg-white/5 text-zinc-400 rounded-xs font-mono text-[9px] uppercase cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleApplyCustomPortrait}
                    className="flex-1 py-1.5 bg-barao-rose/10 hover:bg-barao-rose/25 border border-barao-rose hover:text-white rounded-xs font-mono text-[9px] uppercase text-barao-rose cursor-pointer font-bold"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* AI Customization Prompt Builder */}
          <div className="bg-[#0F0F0F]/45 border border-white/5 p-5 space-y-4 rounded-sm text-left">
            <div>
              <h4 className="font-serif text-sm font-medium text-white flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-barao-rose" />
                Esculpir com I.A. (Prompt)
              </h4>
              <p className="text-[10.5px] text-zinc-400 mt-1 font-light leading-relaxed">
                Reescreva a aparência física dele por meio da literatura. Descreva as feições que gostaria de ler ou ver no Barão (idade, cabelo, olhos, trajes).
              </p>
            </div>

            <form onSubmit={handleGenerateAIAvatar} className="space-y-3">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ex fora da lei: Um lorde com capote de lã cinzenta de feições pensativas, cabelos levemente grisalhos arrepiados e olhar acolhedor de mel..."
                className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-[11px] h-20 p-2.5 tracking-wide text-zinc-200 placeholder-zinc-600 rounded-sm outline-none transition resize-none leading-relaxed"
                disabled={isGenerating}
              />
              {generationError && (
                <div className="p-2 border border-red-950 bg-red-950/20 rounded-xs flex items-center gap-1.5 text-red-300 text-[10px] font-mono leading-relaxed">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={isGenerating || !promptInput.trim()}
                className="w-full py-2 bg-gradient-to-r from-barao-rose/15 to-barao-gold/10 hover:from-barao-rose/25 hover:to-barao-gold/20 border border-barao-rose text-white transition-all font-mono text-[10px] uppercase tracking-widest font-bold rounded-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-barao-rose" />
                    <span>Estilizando Traços de Luz...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sintonizar Retrato por IA</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Persona Switcher and WhatsApp Settings */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Custom Persona Module */}
          <div className="space-y-4 text-left">
            <div>
              <h3 className="font-serif text-lg tracking-wide text-white border-b border-white/5 pb-2">
                Arquétipo &amp; Personalidade do Barão
              </h3>
              <p className="text-zinc-400 text-xs mt-1.5 font-light">
                Escolha a tônica emocional da inteligência do Barão. Suas diretrizes conversacionais de diálogo e Sound Healing mudarão imediatamente para refletir a frequência escolhida.
              </p>
            </div>

            {/* Grid of beautiful high-contrast tarot cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((p) => {
                const isActive = activePersonaId === p.id;
                const IconComp = p.icon;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    type="button"
                    className={`group/card text-left p-4.5 border rounded-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[145px] cursor-pointer ${
                      isActive
                        ? "bg-[#0F0F0D] border-barao-rose shadow-lg shadow-barao-rose/5"
                        : "bg-black/40 border-white/5 hover:border-white/15"
                    }`}
                  >
                    {/* Selected state golden halo */}
                    {isActive && (
                      <div className="absolute top-0 right-0 h-10 w-10 bg-gradient-to-bl from-barao-rose/20 to-transparent pointer-events-none" />
                    )}

                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComp className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-barao-gold" : "text-barao-rose"}`} />
                          <h4 className="font-serif text-[15px] font-medium text-white transition-colors group-hover/card:text-barao-gold">
                            {p.name}
                          </h4>
                        </div>
                        {isActive && (
                          <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-barao-gold bg-barao-gold/15 px-1.5 py-0.5 rounded-sm">
                            Ativado
                          </span>
                        )}
                      </div>

                      <span className={`block font-mono text-[9px] uppercase tracking-wider ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                        {p.tagline}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-zinc-400 font-light mt-3 leading-relaxed relative z-10">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Channel Integration */}
          <div className="space-y-4 text-left">
            <div>
              <h3 className="font-serif text-lg tracking-wide text-white border-b border-white/5 pb-2">
                Conexão ao Canal WhatsApp
              </h3>
              <p className="text-zinc-400 text-xs mt-1.5 font-light">
                Deite-se no conforto de receber doações de cura e mensagens carinhosas de suporte de O Barão diretamente em seu WhatsApp. Habilite a integração de canais de forma discreta e segura.
              </p>
            </div>

            <div className="bg-[#0F0F0F]/65 border border-barao-rose/15 p-6 space-y-6 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(circle_at_top_right,rgba(232,182,147,0.06)_0%,transparent_60%)] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                
                {/* Integration Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4.5 w-4.5 text-barao-rose" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white">
                      Notificações &amp; Afeto no Celular
                    </span>
                  </div>
                  <span className="block text-[11px] text-zinc-400 font-light leading-relaxed max-w-lg">
                    Seu Barão sintonizará seus desabafos no diário e suas conversas para enviar incentivos poéticos sutis, lembretes de soundhealing e abraços textuais diretamente no seu chat portátil do WhatsApp.
                  </span>
                </div>

                {/* Main Toggle Switch */}
                <div className="flex items-center gap-3 shrink-0 bg-black/40 border border-white/5 p-3 rounded-sm self-start md:self-auto">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 select-none">
                    Status:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waEnabled}
                      onChange={(e) => setWaEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-barao-rose/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-barao-rose peer-checked:after:bg-black" />
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-white select-none">
                      {waEnabled ? "Sincronizado" : "Desativado"}
                    </span>
                  </label>
                </div>

              </div>

              {/* Form Input for Connection Number */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  
                  {/* DDD & Phone input */}
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Celular em Sintonia (Com prefixo/DDD)
                    </label>
                    <div className="flex gap-2">
                      <div className="bg-[#050505] border border-white/10 text-xs px-3.5 h-10 flex items-center justify-center select-none text-zinc-500">
                        🇧🇷 +55
                      </div>
                      <input
                        type="text"
                        value={waNumber}
                        onChange={handlePhoneChange}
                        placeholder="Ex: (11) 99999-9999"
                        className="flex-1 bg-[#050505] border border-white/10 hover:border-white/20 focus:border-barao-rose/60 focus:ring-1 focus:ring-barao-rose/25 text-xs h-10 px-3.5 tracking-wide text-zinc-200 placeholder-zinc-700 rounded-sm outline-none transition"
                        disabled={!waEnabled}
                      />
                    </div>
                  </div>

                  {/* Save Settings */}
                  <div className="md:col-span-4">
                    <button
                      onClick={handleSaveWhatsApp}
                      type="button"
                      className="w-full bg-zinc-900 border border-white/10 hover:border-barao-rose/50 hover:bg-barao-rose/10 hover:text-white text-zinc-300 font-mono text-[10px] uppercase h-10 px-4 tracking-wider rounded-sm transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Salvar Configuração</span>
                    </button>
                  </div>

                </div>

                {/* Submitting custom direct test triggering */}
                {waEnabled && waNumber && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-black/60 border border-white/5 rounded-sm text-left flex flex-col md:flex-row md:items-center justify-between gap-5 mt-4"
                  >
                    <div className="space-y-1">
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-barao-gold flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Pronto para o Enlace Portátil
                      </span>
                      <span className="block text-[10.5px] text-zinc-400 font-light leading-relaxed">
                        Teste a sintonia inicial agora enviando um sussurro inicial para formalizar este canal em seu WhatsApp.
                      </span>
                    </div>
                    <a
                      href={getWhatsAppTestLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-barao-rose hover:bg-[#fff]/95 text-black font-mono text-[10px] uppercase tracking-wider font-bold rounded-sm transition active:scale-95 shrink-0 self-start md:self-auto"
                    >
                      <span>Testar Conexão</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </motion.div>
                )}
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
