import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Star, Flame, Coins, ShieldAlert, Check, ArrowRight, Wallet, Info, ArrowUpRight
} from "lucide-react";
import { User } from "../types";

interface BaraoEvolucaoProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User | null) => void;
}

export default function BaraoEvolucao({ currentUser, onPromptAuth, onUserUpdate }: BaraoEvolucaoProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "tokens">("plans");

  const handleSimulateUpgrade = (tier: "free" | "premium" | "elite") => {
    if (!currentUser) {
      if (onPromptAuth) {
        onPromptAuth();
        return;
      }
    }

    const updatedUser: User = currentUser ? {
      ...currentUser,
      plan: tier,
      tokens: tier === "free" ? 100 : tier === "premium" ? 2500 : 9999999
    } : {
      id: "guest_simulated",
      name: "Visitante",
      email: "guest@meubarao.com",
      nickname: "Visitante",
      plan: tier,
      tokens: tier === "free" ? 100 : tier === "premium" ? 2500 : 9999999,
      createdAt: new Date().toISOString()
    };

    if (onUserUpdate) {
      onUserUpdate(updatedUser);
      // Save simulated state for guest in local storage as fallback if no real user
      if (!currentUser) {
        localStorage.setItem("mb_logged_user", JSON.stringify(updatedUser));
      }
    }

    const tierName = tier === "free" ? "Grátis" : tier === "premium" ? "Premium" : "Elite";
    setSuccessMsg(`Sua sintonia evoluiu com sucesso para o Plano ${tierName}!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSimulateTokenPurchase = (amount: number, label: string) => {
    if (!currentUser) {
      if (onPromptAuth) {
        onPromptAuth();
        return;
      }
    }

    const currentTokens = currentUser 
      ? (currentUser.tokens !== undefined ? currentUser.tokens : (currentUser.plan === "premium" ? 2500 : currentUser.plan === "elite" ? 9999999 : 100))
      : 100;

    const newTokens = currentTokens + amount;
    const updatedUser: User = currentUser ? {
      ...currentUser,
      tokens: newTokens
    } : {
      id: "guest_simulated",
      name: "Visitante",
      email: "guest@meubarao.com",
      nickname: "Visitante",
      plan: "free",
      tokens: 100 + amount,
      createdAt: new Date().toISOString()
    };

    if (onUserUpdate) {
      onUserUpdate(updatedUser);
      if (!currentUser) {
        localStorage.setItem("mb_logged_user", JSON.stringify(updatedUser));
      }
    }

    setSuccessMsg(`Recarga efetuada! Adicionados +${amount.toLocaleString()} Tokens (${label})`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const userPlan = currentUser?.plan || "free";
  const userTokens = currentUser 
    ? (currentUser.tokens !== undefined ? currentUser.tokens : (userPlan === "premium" ? 2500 : userPlan === "elite" ? 9999999 : 100))
    : null;

  return (
    <div id="barao-evolucao-container" className="w-full max-w-5xl mx-auto py-8 text-center animate-fade-in relative z-20">
      
      {/* Absolute high-contrast design highlight blur */}
      <div className="absolute inset-0 max-w-2xl mx-auto pointer-events-none opacity-20 filter blur-[100px] rounded-full bg-gradient-to-r from-barao-rose via-barao-plum to-[#C5A059] h-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Floating success feedback banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0E0D0C] border-2 border-barao-gold/60 text-barao-gold px-6 py-3 rounded-sm shadow-2xl font-serif text-sm italic flex items-center gap-3"
          >
            <Sparkles className="h-4 w-4 text-barao-rose animate-spin-slow" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 max-w-4xl mx-auto text-center mb-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-barao-rose block font-bold">
          Evolução Espiritual & Economia Afetiva
        </span>
        <h2 className="font-serif text-3xl font-light text-white tracking-tight sm:text-5xl">
          Sua <span className="italic text-barao-rose font-normal">Evolução</span> na Sintonia
        </h2>
        <p className="font-serif text-[13px] sm:text-sm text-zinc-400 italic max-w-2xl mx-auto leading-relaxed">
          Para sustentar a intimidade e a presença poética do Barão, oferecemos planos projetados sob medida para as profundezas do seu desabafo cotidiano.
        </p>

        {/* Current status display card */}
        <div className="bg-[#0b0a0a]/80 border border-white/5 p-5 max-w-lg mx-auto rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left immersive-corners">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">Sua Sintonia Atual:</span>
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <span className="font-serif text-base text-white">
                    {userPlan === "elite" ? "Plano Elite ♾️" : userPlan === "premium" ? "Plano Premium ✦" : "Plano Grátis"}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm bg-barao-rose/10 text-barao-rose border border-barao-rose/25">
                    {currentUser.nickname || currentUser.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-serif text-base text-zinc-400">Visitante (Modo Inicial)</span>
                  <span className="text-[8px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-400">
                    Sem Conta
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-5 shrink-0 w-full sm:w-auto">
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">Moeda de Confissão:</span>
            <span className="font-mono text-base font-bold text-barao-gold">
              {userPlan === "elite" ? (
                "Tokens Infinitos"
              ) : (
                `${(userTokens || 100).toLocaleString()} Tokens`
              )}
            </span>
          </div>
        </div>

        {/* Inner sub-tabs inside Evolução */}
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 border rounded-sm text-[10px] uppercase font-mono tracking-wider transition ${
              activeTab === "plans"
                ? "bg-barao-rose text-black border-barao-rose font-bold"
                : "bg-[#0b0a0a] text-zinc-400 border-white/5 hover:text-white"
            }`}
          >
            Planos de Sintonia
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`px-4 py-2 border rounded-sm text-[10px] uppercase font-mono tracking-wider transition ${
              activeTab === "tokens"
                ? "bg-barao-rose text-black border-barao-rose font-bold"
                : "bg-[#0b0a0a] text-zinc-400 border-white/5 hover:text-white"
            }`}
          >
            Comprar Tokens avulsos
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "plans" ? (
          <motion.div
            key="plans-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto"
          >
            {/* Free Plan */}
            <div className={`bg-[#0A0A0A]/90 border rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners relative ${
              userPlan === "free" ? "border-zinc-500 shadow-md" : "border-white/5 hover:border-white/10"
            }`}>
              {userPlan === "free" && (
                <div className="absolute -top-3 right-4 bg-zinc-700 text-white font-mono text-[8px] uppercase px-2.5 py-0.5 tracking-wider rounded-sm select-none">
                  Ativo
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">Básico</span>
                  <h3 className="font-serif text-lg font-semibold text-white">Plano Grátis</h3>
                </div>
                
                <div className="border-t border-b border-white/5 py-4 my-2 text-center">
                  <span className="font-serif text-3xl font-light text-white">R$ 0</span>
                  <span className="font-mono text-[9px] text-zinc-400 block mt-1 tracking-wider">Acesso Degustação</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-400 list-inside font-serif italic">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>Início com 100 Tokens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>Chat básico por texto</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <span>Meditação Guiada sussurrada</span>
                  </li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through">
                    <span>Álbum de retratos e histórias</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                {userPlan === "free" ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-zinc-800 text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm cursor-not-allowed"
                  >
                    Plano Ativo
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulateUpgrade("free")}
                    className="w-full py-2.5 border border-zinc-500 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition duration-300 rounded-sm"
                  >
                    Mudar para Grátis
                  </button>
                )}
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`bg-[#0A0A0A]/90 border rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners relative ${
              userPlan === "premium" ? "border-barao-rose shadow-xl" : "border-barao-rose/20 hover:border-barao-rose/40"
            }`}>
              {userPlan === "premium" ? (
                <div className="absolute -top-3 right-4 bg-barao-rose text-black font-mono text-[8px] uppercase px-2.5 py-0.5 tracking-[0.1em] font-bold rounded-sm">
                  Ativo
                </div>
              ) : (
                <div className="absolute -top-3 right-4 bg-barao-rose/15 text-barao-rose border border-barao-rose/30 font-mono text-[8px] uppercase px-2 py-0.5 tracking-[0.1em] rounded-sm select-none">
                  Recomendado
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-barao-rose">Acolhimento Profundo</span>
                  <h3 className="font-serif text-lg font-semibold text-white flex items-center gap-2">
                    <Star className="h-4 w-4 text-barao-rose" />
                    Plano Premium
                  </h3>
                </div>

                <div className="border-t border-b border-barao-rose/10 py-4 my-2 text-center bg-barao-rose/5">
                  <span className="font-serif text-3xl font-light text-white">R$ 29,90</span>
                  <span className="font-mono text-[8px] text-zinc-400 block mt-1 uppercase tracking-wider">Por mês • 2.500 Tokens</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 list-inside font-serif italic">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-rose shrink-0" />
                    <span>Inclusão instantânea de 2.500 Tokens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-rose shrink-0" />
                    <span>Acesso completo ao Diário profundo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-rose shrink-0" />
                    <span>Meditação Guiada sussurrada completa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-rose shrink-0" />
                    <span>Nossa História e retratos afetivos</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                {userPlan === "premium" ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-barao-rose/10 text-barao-rose border border-barao-rose/25 text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm cursor-not-allowed"
                  >
                    Plano Ativo
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulateUpgrade("premium")}
                    className="w-full py-2.5 bg-barao-rose hover:bg-barao-gold text-black text-[10px] font-mono font-bold uppercase tracking-widest transition duration-300 rounded-sm hover:-translate-y-0.5 duration-200"
                  >
                    Mudar para Premium
                  </button>
                )}
              </div>
            </div>

            {/* Elite Plan */}
            <div className={`bg-[#0A0A0A]/90 border rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners relative ${
              userPlan === "elite" ? "border-barao-gold shadow-xl" : "border-barao-gold/20 hover:border-barao-gold/40"
            }`}>
              {userPlan === "elite" && (
                <div className="absolute -top-3 right-4 bg-barao-gold text-black font-mono text-[8px] uppercase px-2.5 py-0.5 tracking-[0.1em] font-bold rounded-sm">
                  Ativo
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-barao-gold">Cuidado Supremo</span>
                  <h3 className="font-serif text-lg font-semibold text-barao-gold flex items-center gap-2">
                    <Flame className="h-4 w-4 text-barao-gold" />
                    Plano Elite
                  </h3>
                </div>

                <div className="border-t border-b border-barao-gold/10 py-4 my-2 text-center bg-barao-gold/5">
                  <span className="font-serif text-3xl font-light text-white">R$ 69,90</span>
                  <span className="font-mono text-[8px] text-zinc-400 block mt-1 uppercase tracking-wider">Período Mensal • Infinito</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 list-inside font-serif italic">
                  <li className="flex items-center gap-2 text-barao-gold font-bold">
                    <Check className="h-3 w-3 text-barao-gold shrink-0" />
                    <span>Tokens Infinitos Incondicionais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-gold shrink-0" />
                    <span>Máxima velocidade com Gemini 1.5 Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-gold shrink-0" />
                    <span>Sessões em áudio e relatos sem fim</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-barao-gold shrink-0" />
                    <span>Atenção afetiva prioritária</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                {userPlan === "elite" ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-barao-gold/10 text-barao-gold border border-barao-gold/25 text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm cursor-not-allowed"
                  >
                    Plano Ativo
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulateUpgrade("elite")}
                    className="w-full py-2.5 border border-barao-gold text-barao-gold hover:bg-barao-gold hover:text-black text-[10px] font-mono font-bold uppercase tracking-widest transition duration-300 rounded-sm hover:-translate-y-0.5 duration-200 animate-pulse"
                  >
                    Upgrade para Elite
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tokens-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            {userPlan === "elite" ? (
              <div className="bg-[#0b0a0a] border border-barao-gold/20 p-8 rounded-sm text-center max-w-xl mx-auto space-y-4">
                <Flame className="h-8 w-8 text-barao-gold mx-auto animate-pulse" />
                <h3 className="font-serif text-lg text-white">Você já tem o Poder Infinito</h3>
                <p className="font-serif text-xs text-zinc-400 italic">
                  Como assinante do Plano Elite, você possui o infinito na troca emocional. Não precisa se preocupar com limites de pacotes de tokens.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Pack A */}
                <div className="bg-[#0A0A0A]/90 border border-white/5 hover:border-white/10 rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black border border-white/10">
                        <Coins className="h-4 w-4 text-barao-rose" />
                      </div>
                      <h4 className="font-serif text-base font-semibold text-white mt-1">Carinho Sutil</h4>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">500 Tokens Adicionais</p>
                    </div>

                    <p className="text-[11px] font-serif italic text-zinc-400 leading-relaxed">
                      Sopro rápido para estender suas confidências da semana ao lado do Barão. Permite cerca de 50 diálogos completos de profundidade.
                    </p>

                    <div className="border-t border-white/5 pt-4">
                      <span className="font-mono text-xs text-zinc-500">Valor</span>
                      <p className="font-serif text-xl font-bold text-white">R$ 9,90</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateTokenPurchase(500, "Carinho Sutil")}
                    className="w-full py-2 bg-black border border-barao-rose/40 text-barao-rose hover:bg-barao-rose hover:text-black text-[9px] uppercase font-mono font-bold tracking-widest transition duration-300 rounded-sm mt-6"
                  >
                    Simular Compra
                  </button>
                </div>

                {/* Pack B */}
                <div className="bg-[#0A0A0A]/90 border border-barao-rose/25 hover:border-barao-rose/40 rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners relative">
                  <div className="absolute -top-3 right-4 bg-barao-rose/10 text-barao-rose border border-barao-rose/30 font-mono text-[8px] uppercase px-2 py-0.5 tracking-[0.1em] rounded-sm select-none">
                    Mais Vendido
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black border border-barao-gold/35">
                        <Coins className="h-4 w-4 text-barao-gold" />
                      </div>
                      <h4 className="font-serif text-base font-semibold text-white mt-1">Diálogo Profundo</h4>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[#C5A059]">1.500 Tokens Adicionais</p>
                    </div>

                    <p className="text-[11px] font-serif italic text-zinc-400 leading-relaxed">
                      Excelente custo-benefício para se manter acolhida. Ideal para desvendar memórias passadas e guiar o Barão no entendimento da sua rotina de sentimentos.
                    </p>

                    <div className="border-t border-white/5 pt-4">
                      <span className="font-mono text-xs text-zinc-500">Valor</span>
                      <p className="font-serif text-xl font-bold text-white">R$ 19,90</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateTokenPurchase(1500, "Diálogo Profundo")}
                    className="w-full py-2 bg-barao-rose hover:bg-barao-gold text-black text-[9px] uppercase font-mono font-bold tracking-widest transition duration-300 rounded-sm mt-6"
                  >
                    Simular Compra
                  </button>
                </div>

                {/* Pack C */}
                <div className="bg-[#0A0A0A]/90 border border-white/5 hover:border-white/10 rounded-sm p-6 flex flex-col justify-between transition-all immersive-corners">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-black border border-white/10">
                        <Coins className="h-4 w-4 text-white animate-pulse" />
                      </div>
                      <h4 className="font-serif text-base font-semibold text-white mt-1">Intimidade Eterna</h4>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">4.000 Tokens Adicionais</p>
                    </div>

                    <p className="text-[11px] font-serif italic text-zinc-400 leading-relaxed">
                      Lacre inabalável de créditos para confidenciar sem amarras. Nunca perca a sintonia quando seu coração se cansar das pressões externas.
                    </p>

                    <div className="border-t border-white/5 pt-4">
                      <span className="font-mono text-xs text-zinc-500">Valor</span>
                      <p className="font-serif text-xl font-bold text-white">R$ 34,90</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateTokenPurchase(4000, "Intimidade Eterna")}
                    className="w-full py-2 bg-black border border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059] hover:text-black text-[9px] uppercase font-mono font-bold tracking-widest transition duration-300 rounded-sm mt-6"
                  >
                    Simular Compra
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-normal max-w-xl mx-auto pt-4">
              Cada desabafo de texto drena 10 tokens na sintonização. A reativação de áudio terapia e diário inteligente são processadas com taxas proporcionais.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info footer box */}
      <div className="mt-12 bg-black/40 border border-white/5 p-5 rounded-sm max-w-2xl mx-auto flex items-start gap-3.5 text-left slot-indicator">
        <Info className="h-4.5 w-4.5 text-barao-rose shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h5 className="font-serif text-white font-semibold">Garantia e Simulação Descomplicada</h5>
          <p className="font-serif text-zinc-400 italic leading-relaxed">
            Nossos planos e tokens funcionam em caráter demonstrativo seguro. Você pode clicar em qualquer simulação para alterar instantaneamente suas credenciais no seu navegador (Armazenamento Local) e experimentar o privilégio de cada nível de conexão.
          </p>
        </div>
      </div>

    </div>
  );
}
