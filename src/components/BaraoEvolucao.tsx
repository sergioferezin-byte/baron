import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { User } from "../types";
import { apiFetch } from "../utils/supabaseSync";
import { lerConfigPublica, type PlanoPublico, type ConfigPublica } from "../utils/configPublica";

interface BaraoEvolucaoProps {
  currentUser: User | null;
  onPromptAuth?: () => void;
  onUserUpdate?: (updatedUser: User | null) => void;
}

function precoBR(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function periodo(plano: PlanoPublico): string {
  if (plano.preco === 0) return "para sempre";
  if (plano.periodoDias === 30) return "por mês";
  if (plano.periodoDias === 365) return "por ano";
  return `por ${plano.periodoDias} dias`;
}

/**
 * Planos e assinatura. Os planos vêm do painel admin (/api/config-publica)
 * e o pagamento é feito no Mercado Pago. O plano só muda depois que o
 * servidor confirma o pagamento.
 */
export default function BaraoEvolucao({ currentUser, onPromptAuth, onUserUpdate }: BaraoEvolucaoProps) {
  const [config, setConfig] = useState<ConfigPublica | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    lerConfigPublica()
      .then(setConfig)
      .finally(() => setCarregando(false));
  }, []);

  // Volta do Mercado Pago: /evolucao?pagamento=aprovado|pendente|falhou
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("pagamento");
    if (!resultado) return;
    window.history.replaceState({}, "", window.location.pathname);

    if (resultado === "aprovado") {
      setAviso({ tipo: "ok", texto: "Pagamento aprovado! Estou preparando seu novo plano..." });
      // O aviso do Mercado Pago pode levar alguns segundos: confere algumas vezes
      let tentativas = 0;
      const conferir = async () => {
        tentativas++;
        const atualizado = await atualizarPlano();
        if (atualizado && atualizado !== "free") {
          setAviso({ tipo: "ok", texto: "Seu plano está ativo. Obrigado por ficar comigo." });
        } else if (tentativas < 6) {
          setTimeout(conferir, 4000);
        } else {
          setAviso({ tipo: "ok", texto: "Pagamento recebido. O plano aparece aqui em instantes." });
        }
      };
      conferir();
    } else if (resultado === "pendente") {
      setAviso({ tipo: "ok", texto: "Pagamento em análise. Assim que for aprovado, seu plano é ativado." });
    } else {
      setAviso({ tipo: "erro", texto: "O pagamento não foi concluído. Você pode tentar de novo quando quiser." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atualizarPlano = async (): Promise<string | null> => {
    if (!currentUser) return null;
    try {
      const res = await apiFetch("/api/pagamentos/meu-plano");
      if (!res.ok) return null;
      const dados = await res.json();
      onUserUpdate?.({
        ...currentUser,
        plan: dados.nivel,
        planoId: dados.planoId,
        planoNome: dados.planoNome,
        planoAte: dados.ate,
        tokens: dados.tokens
      });
      return dados.nivel;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (currentUser) atualizarPlano();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const assinar = async (plano: PlanoPublico) => {
    if (!currentUser) {
      onPromptAuth?.();
      return;
    }
    setAviso(null);
    setAbrindo(plano.id);
    try {
      const res = await apiFetch("/api/pagamentos/checkout", {
        method: "POST",
        body: JSON.stringify({ planoId: plano.id })
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok || !dados?.url) {
        setAviso({ tipo: "erro", texto: dados?.error || "Não consegui abrir o pagamento agora." });
        return;
      }
      window.location.href = dados.url;
    } catch {
      setAviso({ tipo: "erro", texto: "Não consegui abrir o pagamento agora." });
    } finally {
      setAbrindo(null);
    }
  };

  const planoAtualId = currentUser?.planoId || "free";
  const pagamentoAberto = !!config?.pagamento.ativo;

  return (
    <div id="barao-evolucao-container" className="w-full max-w-5xl mx-auto py-8 text-center animate-fade-in relative z-20">
      <div className="absolute inset-0 max-w-2xl mx-auto pointer-events-none opacity-20 filter blur-[100px] rounded-full bg-gradient-to-r from-barao-rose via-barao-plum to-[#C5A059] h-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <AnimatePresence>
        {aviso && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-[#0E0D0C] border-2 px-6 py-3 rounded-sm shadow-2xl font-serif text-sm italic flex items-center gap-3 ${
              aviso.tipo === "ok" ? "border-barao-gold/60 text-barao-gold" : "border-red-400/50 text-red-300"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{aviso.texto}</span>
            <button onClick={() => setAviso(null)} className="ml-2 text-xs not-italic text-zinc-400 hover:text-white" aria-label="Fechar aviso">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 max-w-4xl mx-auto text-center mb-10 px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-barao-rose block font-bold">
          Planos do Meu Barão
        </span>
        <h2 className="font-serif text-3xl font-light text-white tracking-tight sm:text-5xl">
          Sua <span className="italic text-barao-rose font-normal">Evolução</span> na Sintonia
        </h2>
        <p className="font-serif text-sm text-zinc-400 italic max-w-2xl mx-auto leading-relaxed">
          Escolha quanto do Barão você quer por perto. O pagamento é feito com segurança pelo Mercado Pago (Pix, cartão ou boleto).
        </p>

        <div className="bg-[#0b0a0a]/80 border border-white/5 p-5 max-w-lg mx-auto rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left immersive-corners">
          <div className="space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 block">Seu plano</span>
            {currentUser ? (
              <>
                <span className="font-serif text-base text-white block">{currentUser.planoNome || "Plano Grátis"}</span>
                {currentUser.planoAte && (
                  <span className="font-mono text-[11px] text-zinc-400 block">
                    ativo até {new Date(currentUser.planoAte).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </>
            ) : (
              <span className="font-serif text-base text-zinc-400">Visitante (sem conta)</span>
            )}
          </div>
          {currentUser && (
            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-5 shrink-0 w-full sm:w-auto">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 block">Créditos</span>
              <span className="font-mono text-base font-bold text-barao-gold">
                {(currentUser.tokens ?? 0).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto px-4">
          {(config?.planos || []).map(plano => {
            const atual = !!currentUser && plano.id === planoAtualId;
            return (
              <div
                key={plano.id}
                className={`relative flex flex-col justify-between gap-6 bg-[#0b0a0a]/90 border p-6 rounded-sm immersive-corners ${
                  atual
                    ? "border-barao-gold shadow-xl"
                    : plano.destaque
                      ? "border-barao-rose/50"
                      : "border-white/10"
                }`}
              >
                {(plano.destaque || atual) && (
                  <span className="absolute -top-3 left-6 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-barao-rose text-black font-bold">
                    {atual ? "Seu plano" : "Recomendado"}
                  </span>
                )}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-xl text-white">{plano.nome}</h3>
                    {plano.descricao && <p className="font-serif text-sm italic text-zinc-400 mt-1">{plano.descricao}</p>}
                  </div>
                  <div>
                    <span className="font-serif text-3xl text-barao-gold">{plano.preco === 0 ? "Grátis" : precoBR(plano.preco)}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 ml-2">{periodo(plano)}</span>
                  </div>
                  <ul className="space-y-2">
                    {plano.beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="h-4 w-4 text-barao-gold shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="h-4 w-4 text-barao-gold shrink-0 mt-0.5" />
                      <span>
                        {plano.mensagensPorDia === 0 ? "Mensagens sem limite diário" : `Até ${plano.mensagensPorDia} mensagens por dia`}
                      </span>
                    </li>
                  </ul>
                </div>

                {plano.preco === 0 ? (
                  <div className="text-center font-mono text-[11px] uppercase tracking-wider text-zinc-500 py-3 border border-white/5 rounded-sm">
                    {atual ? "Plano atual" : "Incluído na conta"}
                  </div>
                ) : atual ? (
                  <div className="text-center font-mono text-[11px] uppercase tracking-wider text-barao-gold py-3 border border-barao-gold/40 rounded-sm">
                    Plano ativo
                  </div>
                ) : pagamentoAberto ? (
                  <button
                    onClick={() => assinar(plano)}
                    disabled={!!abrindo}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-barao-gold text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-barao-rose transition disabled:opacity-60"
                  >
                    {abrindo === plano.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {currentUser ? "Assinar agora" : "Entrar para assinar"}
                  </button>
                ) : (
                  <div className="text-center font-mono text-[11px] uppercase tracking-wider text-zinc-500 py-3 border border-white/5 rounded-sm">
                    Assinaturas abrem em breve
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 flex items-center justify-center gap-2 font-mono text-[11px] text-zinc-500 px-4">
        <ShieldCheck className="h-4 w-4" />
        Pagamento processado pelo Mercado Pago. O Meu Barão não guarda dados do seu cartão.
      </p>
    </div>
  );
}
