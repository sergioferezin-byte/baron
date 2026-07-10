/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { Eye, EyeOff, Key, Mail, User as UserIcon, Sparkles, AlertCircle, Heart, Check } from "lucide-react";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { syncUserProfile } from "../utils/firebaseSync";

// Cache de sessão apenas — nunca fonte de dados. A fonte real é Firebase Auth + Firestore
// (ver syncUserProfile/getUserProfile em utils/firebaseSync.ts).
const SESSION_USER_KEY = "mb_logged_user";

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

  // Autenticação Google real via Firebase Auth. Sem fallback simulado: se o Firebase Auth
  // não conseguir autenticar de verdade, mostramos erro ao usuário.
  const triggerGoogleAuth = async () => {
    setError(null);
    if (!acceptedTermsPrivacy) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.");
      return;
    }

    if (!auth) {
      setError("Autenticação indisponível no momento. Tente novamente mais tarde.");
      return;
    }

    setLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // signInWithPopup is unreliable on mobile browsers (blocked, silently ignored, or the
    // popup just never resolves). Firebase's own guidance is to use a redirect there
    // instead: the page navigates to Google and back, and App.tsx's getRedirectResult
    // effect picks up the completed sign-in when the app reloads.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (fbErr: any) {
        console.warn("[Firebase Google Auth Redirect] Error:", fbErr.code, fbErr.message);
        setError(`Erro na sintonização Google: ${fbErr.message || fbErr}`);
        setLoading(false);
      }
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const matchedUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split("@")[0] || "Visitante",
        email: fbUser.email || "",
        nickname: fbUser.displayName || fbUser.email?.split("@")[0] || "Visitante",
        createdAt: fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).toISOString() : new Date().toISOString(),
        plan: "premium",
        tokens: 3000
      };

      await syncUserProfile(matchedUser);

      setSuccessMsg(`Conectada via Google! Bem-vinda de volta, ${matchedUser.nickname || matchedUser.name}!`);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(matchedUser));

      setTimeout(() => {
        onSuccess(matchedUser);
      }, 1200);
    } catch (fbErr: any) {
      console.warn("[Firebase Google Auth Popup] Error:", fbErr.code, fbErr.message);
      if (fbErr.code === "auth/popup-blocked") {
        setError("O pop-up do Google foi bloqueado pelo seu navegador. Por favor, libere os pop-ups para este site e tente novamente.");
      } else if (fbErr.code === "auth/cancelled-popup-request" || fbErr.code === "auth/popup-closed-by-user") {
        // Usuário cancelou o pop-up: nenhuma mensagem de erro necessária.
      } else if (fbErr.code === "auth/operation-not-allowed") {
        setError("O provedor Google ainda não está ativo no console do seu Firebase. Acesse Firebase Console -> Authentication -> Sign-in method e ative o Google.");
      } else {
        setError(`Erro na sintonização Google: ${fbErr.message || fbErr}`);
      }
      setLoading(false);
    }
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

    if (!auth) {
      setError("Autenticação indisponível no momento. Tente novamente mais tarde.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const matchedUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split("@")[0],
        email: fbUser.email || email,
        nickname: fbUser.displayName || email.split("@")[0],
        createdAt: fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).toISOString() : new Date().toISOString(),
        plan: "premium",
        tokens: 3000
      };

      await syncUserProfile(matchedUser);

      setSuccessMsg(`Bem-vinda de volta, ${matchedUser.nickname || matchedUser.name}!`);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(matchedUser));
      setTimeout(() => {
        onSuccess(matchedUser);
      }, 1200);
    } catch (err: any) {
      console.warn("[Firebase Auth Login]", err.code, err.message);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas seguidas. Aguarde um instante e tente novamente.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
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

    if (!auth) {
      setError("Autenticação indisponível no momento. Tente novamente mais tarde.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: nickname || name });

      const newUser: User = {
        id: userCredential.user.uid,
        name,
        email,
        nickname,
        preferredSound,
        createdAt: new Date().toISOString(),
        plan: selectedPlan,
        tokens: selectedPlan === 'free' ? 100 : selectedPlan === 'premium' ? 2500 : 9999999
      };

      await syncUserProfile(newUser, {
        nickname,
        biography: `Sintonizada como ${name} com preferências em som ${preferredSound}`
      });

      setSuccessMsg("Seu abrigo íntimo foi criado. Sintonizando presença com a nuvem...");
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(newUser));

      setTimeout(() => {
        onSuccess(newUser);
      }, 1500);
    } catch (err: any) {
      console.warn("[Firebase Auth Register]", err.code, err.message);
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está sintonizado com O Barão. Tente fazer login.");
      } else if (err.code === "auth/weak-password") {
        setError("Sua chave de acesso precisa ter pelo menos 6 caracteres.");
      } else if (err.code === "auth/invalid-email") {
        setError("Por favor, insira um e-mail válido.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
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

          {/* Divider de Alternativa */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-[1px] bg-white/10 flex-grow" />
            <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-[0.2em]">ou sintonizar com</span>
            <div className="h-[1px] bg-white/10 flex-grow" />
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={triggerGoogleAuth}
            disabled={loading}
            className="w-full h-12 bg-[#050505] hover:bg-black border border-white/5 hover:border-barao-rose/30 text-xs text-zinc-300 hover:text-white font-medium tracking-wide transition-all duration-300 rounded-sm active:scale-98 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0 leading-none">
              <path fill="#4285F4" d="M23.745 12.27c0-.77-.07-1.54-.2-2.27H12v4.51h6.6c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.68-5.17 3.68-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.14 0-5.8-2.11-6.75-4.96H1.31v3.09C3.26 21.3 7.37 24 12 24z"/>
              <path fill="#FBBC05" d="M5.25 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.31C.47 8.24 0 10.06 0 12s.47 3.76 1.31 5.38l3.94-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.31 6.62l3.94 3.09c.95-2.85 3.61-4.96 6.75-4.96z"/>
            </svg>
            <span>{mode === "login" ? "Entrar com o Google" : "Cadastrar com o Google"}</span>
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
