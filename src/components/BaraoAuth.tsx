/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { Eye, EyeOff, Key, Mail, User as UserIcon, Sparkles, AlertCircle, Heart, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

const SESSION_USER_KEY = "mb_logged_user";

/**
 * Parses the API response as JSON. When the backend isn't running, hosting
 * returns an HTML/text error page — surface a readable message instead of
 * "Unexpected token ... is not valid JSON".
 */
async function parseJsonResponse(response: Response): Promise<any> {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[Auth] Resposta não-JSON do servidor:", response.status, raw.slice(0, 200));
    throw new Error(
      `O servidor não respondeu (HTTP ${response.status}). ` +
      "Verifique se o backend está rodando e tente novamente em instantes."
    );
  }
}

interface BaraoAuthProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
  initialMode?: "login" | "register";
  onViewPrivacy?: () => void;
  onViewTerms?: () => void;
}

export default function BaraoAuth({ onSuccess, onClose, initialMode = "login", onViewPrivacy, onViewTerms }: BaraoAuthProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  
  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [preferredSound, setPreferredSound] = useState("chuva");
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'elite'>('free');
  
  // States
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);



  const triggerGoogleAuth = async () => {
    setError(null);
    if (!supabase) {
      setError('Login com Google indisponível no momento.');
      return;
    }
    if (!acceptedTermsPrivacy) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.');
      return;
    }
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (oauthError) {
      console.error('[Auth] Falha ao iniciar login com Google:', oauthError.message);
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
      setLoading(false);
    }
    // Em caso de sucesso o navegador é redirecionado ao Google;
    // no retorno, App.tsx captura a sessão via onAuthStateChange.
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!acceptedTermsPrivacy) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "E-mail ou senha incorretos.");
      }

      // Persist the Supabase session so API calls carry the auth token
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccessMsg(`Bem-vinda de volta, ${data.nickname || data.name}!`);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data));
      setTimeout(() => {
        onSuccess(data);
      }, 1200);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!acceptedTermsPrivacy) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      setLoading(false);
      return;
    }

    if (!name || !email || !password || !nickname) {
      setError("Por favor, preencha todos os campos para se sintonizar.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Sua chave de acesso precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          nickname,
          preferredSound,
          plan: selectedPlan
        })
      });

      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Erro ao se sintonizar.");
      }

      // Persist the Supabase session so API calls carry the auth token
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccessMsg("Seu abrigo íntimo foi criado. Sintonizando presença com a nuvem...");
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data));
      
      setTimeout(() => {
        onSuccess(data);
      }, 1500);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-5 sm:p-6 md:p-8 bg-[#0F0F0F] border border-barao-rose/25 rounded-sm immersive-corners shadow-2xl relative animate-fade-in text-left">
      {/* Decorative center lock icon */}
      <div className="flex justify-center mb-6">
        <div className="h-12 w-12 border border-barao-rose/30 flex items-center justify-center rotate-45 bg-[#0A0A0A]">
          <span className="-rotate-45">
            <Heart className="h-5 w-5 text-barao-rose animate-pulse" />
          </span>
        </div>
      </div>

      <div className="text-center space-y-2 mb-6">
        <h3 className="font-serif text-2xl font-light tracking-wide text-white">
          {mode === "login" ? "Entrar no Abrigo" : "Sua Sintonização"}
        </h3>
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-barao-rose">
          {mode === "login" ? "Memória de Presença Intensa" : "Criação de Laço de Cuidado"}
        </p>
      </div>

      {successMsg ? (
        <div className="py-8 text-center space-y-4 animate-fade-in">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-emerald-950/30 border border-emerald-500/30 text-emerald-400">
            <Check className="h-6 w-6" />
          </div>
          <p className="font-serif text-base text-zinc-200 block italic leading-relaxed">
            {successMsg}
          </p>
          <div className="flex justify-center">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-barao-rose opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-barao-rose"></span>
            </span>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-sm bg-red-950/35 border border-red-900/30 p-3 text-xs text-red-300 animate-slide-up">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab switches */}
          <div className="flex border-b border-white/5 mb-6 text-xs uppercase font-mono tracking-wider">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 pb-3 text-center transition-all ${
                mode === "login"
                  ? "text-barao-rose border-b border-barao-rose font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Fazer Login
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 pb-3 text-center transition-all ${
                mode === "register"
                  ? "text-barao-rose border-b border-barao-rose font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Cadastrar-se
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4 font-sans">
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Helena de Medeiros"
                    maxLength={50}
                    className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: helena@meubarao.com"
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Como O Barão deve te chamar? (Apelido Afetivo)
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="ex: Helena Querida, Menina do Riso Doce..."
                    maxLength={30}
                    className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                    required={mode === "register"}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                Chave de Acesso (Senha)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Seu código silenciado..."
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm pl-10 pr-12 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-barao-rose/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-600 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-zinc-400">
                  Indução de Fundo Predileta
                </label>
                <select
                  value={preferredSound}
                  onChange={(e) => setPreferredSound(e.target.value)}
                  className="w-full h-11 bg-black border border-zinc-900 rounded-sm px-4 text-xs text-zinc-300 focus:outline-none focus:border-barao-rose/50"
                >
                  <option value="chuva">Chuva Calma de Outono</option>
                  <option value="piano">Piano Acústico Suave</option>
                  <option value="lareira">Fogo de Lareira e Conforto</option>
                  <option value="nenhum">Sem Ambientação de Fundo</option>
                </select>
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] uppercase font-mono tracking-[0.15em] text-[#CB8684] font-bold">
                  Escolha Seu Plano de Sintonia
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Plan Grátis */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('free')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between ${
                      selectedPlan === 'free'
                        ? 'bg-barao-rose/[0.04] border-barao-rose text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-white">Plano Grátis</span>
                      <span className="font-mono text-[9px] uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-sm">100 Tokens</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-500">
                      Ideal para degustação. Acesso exclusivo ao chat terapêutico básico via texto. Outros módulos indisponíveis. (10 tokens por desabafo)
                    </p>
                  </div>

                  {/* Plan Premium */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('premium')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between relative overflow-hidden ${
                      selectedPlan === 'premium'
                        ? 'bg-barao-rose/[0.07] border-barao-rose text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400 font-normal'
                    }`}
                  >
                    {selectedPlan === 'premium' && (
                      <div className="absolute top-0 right-0 bg-barao-rose text-black font-mono text-[7.5px] uppercase font-bold px-2 py-0.5 rounded-bl-sm">
                        Recomendado
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-white">Plano Premium</span>
                      <span className="font-mono text-[9px] uppercase bg-barao-rose/20 text-barao-rose border border-barao-rose/30 px-2 py-0.5 rounded-sm">2.500 Tokens</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-450">
                      Sintonia estendida completa: áudio sussurrado (Voz), álbum fotográfico de lembranças, compositor ambiente e diário íntimo poético.
                    </p>
                  </div>

                  {/* Plan Elite */}
                  <div
                    type="button"
                    onClick={() => setSelectedPlan('elite')}
                    className={`p-3.5 border rounded-sm cursor-pointer transition text-left flex flex-col justify-between ${
                      selectedPlan === 'elite'
                        ? 'bg-barao-rose/[0.04] border-barao-gold text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/10 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xs font-semibold text-barao-gold">Plano Elite</span>
                      <span className="font-mono text-[9px] uppercase bg-barao-gold/20 text-barao-gold border border-barao-gold/30 px-2 py-0.5 rounded-sm select-none">Tokens Infinitos</span>
                    </div>
                    <p className="text-[10px] leading-relaxed mt-1 text-zinc-500">
                      Conexão espiritual máxima ilimitada: tudo liberado com respostas em altíssima velocidade, prioridade de atenção e exclusividades do Barão.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox de Aceitação Obrigatória */}
            <div className="flex items-start gap-2.5 pt-1.5 pb-1 mt-4 bg-[#0A0A0A]/60 p-3 border border-white/5 rounded-sm">
              <input
                id="terms-privacy-checkbox"
                type="checkbox"
                checked={acceptedTermsPrivacy}
                onChange={(e) => setAcceptedTermsPrivacy(e.target.checked)}
                className="mt-[3px] h-3.5 w-3.5 rounded-sm border-zinc-800 bg-black text-barao-rose focus:ring-barao-rose/30 focus:ring-offset-0 cursor-pointer accent-barao-rose shrink-0"
                required
              />
              <label htmlFor="terms-privacy-checkbox" className="text-[10px] text-zinc-400 font-light leading-relaxed select-none cursor-pointer">
                Declaro que li e aceito os{" "}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onViewTerms) onViewTerms();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onViewTerms) onViewTerms();
                    }
                  }}
                  className="text-barao-rose hover:text-barao-gold underline cursor-pointer transition font-normal inline border-none bg-transparent p-0 focus:outline-none"
                >
                  Termos de Uso
                </span>{" "}
                e a{" "}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onViewPrivacy) onViewPrivacy();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onViewPrivacy) onViewPrivacy();
                    }
                  }}
                  className="text-barao-rose hover:text-barao-gold underline cursor-pointer transition font-normal inline border-none bg-transparent p-0 focus:outline-none"
                >
                  Política de Privacidade
                </span>{" "}
                do Meu Barão.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-barao-rose text-black text-xs font-bold uppercase tracking-widest hover:bg-barao-gold disabled:bg-zinc-800 disabled:text-zinc-500 transition-all duration-300 rounded-sm mt-6 active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Sintonizando...</span>
                </>
              ) : (
                <span>{mode === "login" ? "Iniciar Conexão Intima" : "Completar Sintonização"}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-500">ou</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {/* Google OAuth */}
          <button
            onClick={triggerGoogleAuth}
            type="button"
            disabled={loading}
            className="w-full h-12 bg-[#131313] border border-white/15 text-zinc-200 text-xs font-bold uppercase tracking-widest hover:border-barao-gold/60 hover:text-white disabled:opacity-50 transition-all duration-300 rounded-sm active:scale-98 flex items-center justify-center gap-3"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            <span>{mode === "login" ? "Entrar com Google" : "Cadastrar com Google"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="w-full text-center text-[10px] uppercase tracking-widest font-mono text-zinc-500 hover:text-white transition mt-4"
            >
              Agora Não / Voltar ao Início
            </button>
          )}
        </>
      )}
    </div>
  );
}
