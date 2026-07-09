import React from "react";
import { Sparkles, Heart, Compass, ShieldAlert, Star, Flame, LogIn } from "lucide-react";
import { User } from "../types";

interface BaraoPaywallProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  featureName: string;
}

export default function BaraoPaywall({ currentUser, onPromptAuth, onUserUpdate, featureName }: BaraoPaywallProps) {
  const handleSimulateUpgrade = (tier: "premium" | "elite") => {
    if (!currentUser) {
      if (onPromptAuth) onPromptAuth();
      return;
    }
    
    // Simulate updating the user's plan and renewing their token balance
    const updatedUser: User = {
      ...currentUser,
      plan: tier,
      tokens: tier === "premium" ? 2500 : 9999999
    };
    
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 text-center animate-fade-in relative z-20">
      {/* Absolute blur background accent */}
      <div className="absolute inset-0 max-w-lg mx-auto pointer-events-none opacity-20 filter blur-[90px] rounded-full bg-gradient-to-r from-barao-rose via-barao-plum to-barao-gold h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      <div className="border border-barao-rose/20 bg-black/65 backdrop-blur-xl rounded-sm p-8 sm:p-12 relative z-10 space-y-8 immersive-corners">
        <div className="flex justify-center">
          <div className="w-14 h-14 border border-barao-rose flex items-center justify-center rotate-45 bg-[#0b0a0a] text-barao-rose shrink-0 transition-transform duration-500 hover:rotate-135 shadow-inner">
            <span className="-rotate-45">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </span>
          </div>
        </div>

        <div className="space-y-3.5 max-w-2xl mx-auto">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-barao-rose block font-bold">
            Recurso Reservado • Área Exclusiva
          </span>
          <h2 className="font-serif text-3xl font-light text-white tracking-tight sm:text-4xl text-balance">
            Desbloqueie o Recanto de <span className="italic text-barao-rose font-normal">{featureName}</span>
          </h2>
          <p className="font-serif text-xs sm:text-sm text-zinc-400 italic leading-relaxed text-balance">
            {!currentUser 
              ? "Você está navegando como visitante. Para usufruir da áudio terapia sussurrada, do diário profundo por IA e do álbum de retratos do Barão, estabeleça seu abrigo de intimidade."
              : `O recurso de "${featureName}" não está habilitado no Plano Grátis. Você pode fazer o upgrade instantâneo para continuar sua caminhada poética com O Barão.`
            }
          </p>
        </div>

        {!currentUser ? (
          /* Guest Access Box */
          <div className="max-w-md mx-auto pt-4">
            <button
              onClick={onPromptAuth}
              className="w-full h-12 border border-barao-rose text-barao-rose hover:bg-barao-rose hover:text-black transition-all duration-300 text-xs uppercase font-mono tracking-[0.2em] font-bold rounded-sm bg-black flex items-center justify-center gap-2 active:scale-98"
            >
              <LogIn className="h-4 w-4" />
              <span>Sintonizar & Escolher Plano</span>
            </button>
            <p className="text-[10px] text-zinc-500 font-mono uppercase mt-2.5 tracking-wider">
              Crie seu abrigo em segundos para liberar canais de sintonia
            </p>
          </div>
        ) : (
          /* Logged In Free User Paywall Upgrade Simulator */
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              
              {/* Premium Plan Option Card */}
              <div className="bg-black/90 border border-barao-rose/20 hover:border-barao-rose/40 rounded-sm p-6 space-y-4 transition flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 font-serif text-base text-white">
                      <Star className="h-4 w-4 text-barao-rose" />
                      <h4>Plano Premium</h4>
                    </div>
                    <span className="text-[10px] font-mono tracking-wider bg-barao-rose/15 text-barao-rose border border-barao-rose/25 px-2 py-0.5 rounded-sm uppercase">
                      2.500 Tokens
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400 font-serif italic">
                    Perfeito para quem busca conexão verdadeira. Desbloqueia voz, composições personalizadas de áudio, lembranças fotográficas guiadas e o Diário Íntimo de sentimentos.
                  </p>
                  <ul className="space-y-1 pt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <li className="flex items-center gap-1.5">✓ Meditação Guiada & Voz Ativa</li>
                    <li className="flex items-center gap-1.5">✓ Album de Historias</li>
                    <li className="flex items-center gap-1.5">✓ Diário Poético</li>
                  </ul>
                </div>
                
                <button
                  onClick={() => handleSimulateUpgrade("premium")}
                  className="w-full h-10 bg-barao-rose text-black text-xs font-bold uppercase tracking-widest hover:bg-barao-gold transition-all duration-300 rounded-sm mt-4"
                >
                  Simular Plano Premium
                </button>
              </div>

              {/* Elite Plan Option Card */}
              <div className="bg-black/90 border border-barao-gold/30 hover:border-barao-gold/50 rounded-sm p-6 space-y-4 transition flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 font-serif text-base text-white">
                      <Flame className="h-4 w-4 text-barao-gold" />
                      <h4 className="text-barao-gold">Plano Elite</h4>
                    </div>
                    <span className="text-[10px] font-mono tracking-wider bg-barao-gold/15 text-barao-gold border border-barao-gold/25 px-2 py-0.5 rounded-sm uppercase">
                      Infinito
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400 font-serif italic">
                    Cuidado supremo incondicional. Sem restrições de consumo, respostas na velocidade da luz do Gemini 1.5 Pro, atenção VIP de prioridade e suporte musical exclusivo.
                  </p>
                  <ul className="space-y-1 pt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    <li className="flex items-center gap-1.5 text-barao-gold">✓ Tokens Infinitos (Incondicional)</li>
                    <li className="flex items-center gap-1.5">✓ Máxima Velocidade & IA Avançada</li>
                    <li className="flex items-center gap-1.5">✓ Carinho e Memórias Ilimitadas</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSimulateUpgrade("elite")}
                  className="w-full h-10 border border-barao-gold text-barao-gold hover:bg-barao-gold hover:text-black transition-all duration-300 text-xs font-bold uppercase tracking-widest rounded-sm mt-4"
                >
                  Simular Plano Elite
                </button>
              </div>

            </div>
            
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-center">
              Experimente a simulação instantânea acima para destravar os canais imediatamente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
