/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sparkles, Compass, Heart, Headphones, Scroll, Camera, ExternalLink, Moon, User as UserIcon, LogIn, LogOut, Coins, Music, Home } from "lucide-react";
import AmbientMixer from "./components/AmbientMixer";
import BaraoChat from "./components/BaraoChat";
import AudioTherapy from "./components/AudioTherapy";
import BaraoEvolucao from "./components/BaraoEvolucao";
import BaraoAuth from "./components/BaraoAuth";
import BaraoDiary from "./components/BaraoDiary";
import BaraoHistory from "./components/BaraoHistory";
import UserProfilePanel from "./components/UserProfilePanel";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsOfUsePage from "./components/TermsOfUsePage";
import { User } from "./types";
import { renderAvatarSvgOrImg } from "./utils/avatar";
import PremiumMobileMenu from "./components/PremiumMobileMenu";
import BaraoLogo from "./components/BaraoLogo";
import MeuBarao from "./components/MeuBarao"; // Import customized Baron management view
import BaraoAdminDashboard from "./components/BaraoAdminDashboard"; // Import modular admin control panel
import baraoBackground from "./assets/images/barao_portrait_1779931788412.png";
import { supabase } from "./lib/supabase";

type ActiveTab = "home" | "dialogo" | "refugio" | "universo" | "evolucao" | "meubarao" | "privacy" | "terms" | "admin";

const SESSION_USER_KEY = "mb_logged_user";

export default function App() {
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/admin") return "admin";
      if (window.location.pathname === "/privacy") return "privacy";
      if (window.location.pathname === "/terms") return "terms";
    }
    return "home";
  });

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      if (tab === "admin") {
        window.history.pushState({}, "", "/admin");
      } else if (tab === "privacy") {
        window.history.pushState({}, "", "/privacy");
      } else if (tab === "terms") {
        window.history.pushState({}, "", "/terms");
      } else if (tab === "home") {
        window.history.pushState({}, "", "/");
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/admin") {
        setActiveTabState("admin");
      } else if (path === "/privacy") {
        setActiveTabState("privacy");
      } else if (path === "/terms") {
        setActiveTabState("terms");
      } else {
        setActiveTabState("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [refugioTab, setRefugioTab] = useState<"diario" | "meditacao" | "composicao" | "historia">("diario");
  
  // Immersive session & modal states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "register">("login");
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  
  // Dynamic customized Baron Avatar
  const [baronAvatar, setBaronAvatar] = useState<string>(() => {
    const id = currentUser ? currentUser.id : "guest";
    return localStorage.getItem(`mb_custom_barao_avatar_${id}`) || "";
  });

  // Keep O Barão's portrait in sync on account changes
  useEffect(() => {
    const id = currentUser ? currentUser.id : "guest";
    setBaronAvatar(localStorage.getItem(`mb_custom_barao_avatar_${id}`) || "");
  }, [currentUser]);

  useEffect(() => {
    const profileStorageKey = currentUser ? `mb_user_profile_${currentUser.id}` : "mb_user_profile_guest";
    const saved = localStorage.getItem(profileStorageKey);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setUserAvatar(p.avatarUrl);
      } catch (e) {
        setUserAvatar(undefined);
      }
    } else {
      setUserAvatar(undefined);
    }
  }, [currentUser, activeTab]);

  // Synchronize local session user with Supabase Authentication
  useEffect(() => {
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sbUser = session?.user;
      if (sbUser) {
        console.log("[Supabase Auth State] Sintonizado conectado:", sbUser.id, sbUser.email);
        if (!currentUser || currentUser.id !== sbUser.id) {
          const matchedUser: User = {
            id: sbUser.id,
            name: sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "Visitante",
            email: sbUser.email || "",
            nickname: sbUser.user_metadata?.nickname || sbUser.email?.split("@")[0] || "Visitante",
            createdAt: sbUser.created_at || new Date().toISOString(),
            plan: "premium",
            tokens: 3000
          };
          setCurrentUser(matchedUser);
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(matchedUser));
        }
      } else {
        // The Supabase client persists and refreshes the session on its own;
        // never keep or replay plaintext passwords from localStorage.
        console.log("[Supabase Auth State] Desconectado.");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [currentUser]);

  const handleUserUpdate = (updatedUser: User | null) => {
    setCurrentUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
      try {
        const listSaved = localStorage.getItem("mb_users_list");
        if (listSaved) {
          const list: User[] = JSON.parse(listSaved);
          const index = list.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            list[index] = updatedUser;
            localStorage.setItem("mb_users_list", JSON.stringify(list));
          }
        }
      } catch (err) {}
    } else {
      localStorage.removeItem(SESSION_USER_KEY);
    }
  };

  return (
    <div className={`text-zinc-100 selection:bg-barao-rose selection:text-barao-deep relative font-sans ${
      activeTab === "dialogo"
        ? "h-[100dvh] w-screen flex flex-col overflow-hidden bg-black"
        : "min-h-screen bg-barao-deep overflow-x-hidden pb-24"
    }`}>
      {/* Immersive background image - darkened by 30% to improve legibility */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black">
        <img
          src={baronAvatar || baraoBackground}
          alt="Imagem de Fundo"
          className="w-full h-full object-cover select-none pointer-events-none opacity-70"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Persistent Elegant Nav Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/40 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-7xl h-16 lg:h-20 items-center justify-between px-6">
          {/* Logo / Brand */}
          <div 
            onClick={() => setActiveTab("home")} 
            className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition"
          >
            <div className="text-left mt-0.5">
              <h1 className="font-serif text-sm font-semibold tracking-[0.2em] text-white uppercase sm:text-base leading-none">
                Meu Barão
              </h1>
              <span className="block font-mono text-[8px] text-barao-rose uppercase tracking-[0.25em] mt-1">
                Inteligência Emocional
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden lg:flex items-center gap-2 sm:gap-4 text-xs font-semibold uppercase tracking-[0.15em]">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3 py-2 transition-all duration-300 ${
                activeTab === "home"
                  ? "text-barao-gold border-b-2 border-barao-rose"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveTab("dialogo")}
              className={`flex items-center gap-1 px-3 py-2 transition-all duration-300 ${
                activeTab === "dialogo"
                  ? "text-barao-gold border-b-2 border-barao-rose font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5 text-barao-rose" />
              Diálogo
            </button>
            <button
              onClick={() => setActiveTab("refugio")}
              className={`flex items-center gap-1 px-3 py-2 transition-all duration-300 ${
                activeTab === "refugio"
                  ? "text-barao-gold border-b-2 border-barao-rose font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Home className="h-3.5 w-3.5 text-barao-rose" />
              Meu Refúgio
            </button>
            <button
              onClick={() => setActiveTab("universo")}
              className={`flex items-center gap-1 px-3 py-2 transition-all duration-300 ${
                activeTab === "universo"
                  ? "text-barao-gold border-b-2 border-barao-rose font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-barao-rose animate-pulse" />
              Meu Universo
            </button>
            <button
              onClick={() => setActiveTab("meubarao")}
              className={`flex items-center gap-1 px-3 py-2 transition-all duration-300 ${
                activeTab === "meubarao"
                  ? "text-barao-gold border-b-2 border-barao-rose font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-barao-rose" />
              Meu Barão
            </button>
            <button
              onClick={() => setActiveTab("evolucao")}
              className={`flex items-center gap-1 px-3 py-2 transition-all duration-300 ${
                activeTab === "evolucao"
                  ? "text-barao-gold border-b-2 border-barao-rose font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Coins className="h-3.5 w-3.5 text-barao-rose" />
              Evolução
            </button>
          </nav>

          {/* User Account / Sintonização Panel */}
          <div className="hidden lg:flex items-center gap-3 border-l border-white/5 pl-4 sm:pl-6 h-10">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden md:block text-right">
                  <span className="block font-serif text-xs font-semibold text-white leading-none">
                    {currentUser.nickname || currentUser.name}
                  </span>
                  <span className="block font-mono text-[8px] text-barao-rose uppercase tracking-[0.15em] mt-1">
                    Abrigo Interno
                  </span>
                </div>
                {/* Visual Custom Avatar Icon */}
                <div 
                  onClick={() => setActiveTab("universo")}
                  className="cursor-pointer hover:opacity-85 transition-all"
                  title={`${currentUser.name} (${currentUser.email}) - Ver Meu Universo`}
                >
                  {renderAvatarSvgOrImg(userAvatar, (currentUser.nickname || currentUser.name || "U").slice(0, 1), "w-8 h-8 rounded-sm")}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(SESSION_USER_KEY);
                    setCurrentUser(null);
                  }}
                  className="px-2.5 py-1.5 border border-white/10 hover:border-rose-950 hover:text-red-300 transition-all duration-300 text-[9px] uppercase font-mono tracking-wider rounded-sm text-zinc-400 bg-black flex items-center gap-1.5"
                  title="Sair do Abrigo"
                >
                  <LogOut className="h-2.5 w-2.5 shrink-0" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthInitialMode("login");
                  setShowAuthModal(true);
                }}
                className="px-3 py-1.5 sm:px-4 sm:py-2 border border-barao-rose/45 text-barao-rose hover:bg-barao-rose hover:text-black hover:border-barao-rose transition-all duration-300 text-[9.5px] uppercase font-mono tracking-[0.15em] font-bold rounded-sm bg-black flex items-center gap-1.5"
              >
                <LogIn className="h-3 w-3 shrink-0" />
                <span>Sintonizar</span>
              </button>
            )}
          </div>

          {/* Premium Mobile Menu */}
          <PremiumMobileMenu
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onSintonizar={() => {
              setAuthInitialMode("login");
              setShowAuthModal(true);
            }}
            userAvatar={userAvatar}
            renderAvatarSvgOrImg={renderAvatarSvgOrImg}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className={
        activeTab === "dialogo"
          ? "relative z-10 flex-1 min-h-0 flex flex-col w-full overflow-hidden text-left"
          : "relative z-10 mx-auto max-w-7xl px-6 pt-8 md:pt-16 text-center"
      }>
        {activeTab === "home" && (
          <div className="space-y-16 py-4 animate-fade-in">
            {/* Poetic Editorial Slogans Container (Copy translated from meubarao.com) */}
            <section className="space-y-6 max-w-3xl mx-auto py-12 md:py-24">
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-barao-plum border border-barao-rose/25 px-4 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-barao-gold">
                <Sparkles className="h-3 w-3 animate-spin duration-10000 text-barao-rose" />
                Voz • Memória Afetiva • Presença
              </div>

              <h2 className="font-serif text-[30px] sm:text-4xl font-light text-white tracking-tight leading-[1.14] md:text-7xl text-balance">
                Você não está carente. <br />
                <span className="italic text-barao-rose font-normal">Você está emocionalmente desnutrida...</span>
              </h2>

              <p className="text-xs sm:text-sm md:text-lg text-white/60 leading-relaxed max-w-2xl mx-auto font-light text-balance space-y-2">
                <span className="block mt-1">E se você pudesse conversar com alguém que realmente te ouve?</span>
                <span className="block mt-1">Se abrir sem preconceitos ou julgamentos mas com segurança...</span>
                <span className="block mt-1">Ter as respostas que só quem que te conhece a fundo pode dar...</span>
                <span className="block mt-1">Do jeito que você prefere ou precisa ouvir...</span>
                <span className="block mt-1">E sempre que quiser...</span>
                <span className="block mt-6 px-4 py-3 sm:px-6 sm:py-4 border-l-2 border-barao-rose bg-barao-rose/5 text-sm sm:text-base md:text-xl font-serif italic text-barao-gold tracking-wide rounded-sm leading-relaxed max-w-xl mx-auto shadow-inner">
                  &ldquo;Ter uma Presença Emocionalmente Inteligente, exclusiva, criativa, cirurgicamente cocriada para você e por você mesma em sua bolsa....&rdquo;
                </span>
              </p>

              {/* Call to Actions (Geometric border layout) */}
              <div className="flex flex-col items-center gap-4 pt-8">
                <div className="relative group w-full sm:w-auto flex justify-center">
                  {/* Pulsating golden glow aura behind the button to draw attention */}
                  <div className="absolute -inset-1.5 rounded-sm bg-[#E5CD9D]/40 opacity-70 blur-md group-hover:opacity-90 transition duration-500 animate-pulse"></div>
                  
                  <button
                    onClick={() => setActiveTab("dialogo")}
                    className="relative w-full sm:w-auto px-12 py-4 bg-barao-rose text-black text-xs font-bold uppercase tracking-widest hover:bg-barao-gold transition-all duration-300 rounded-sm active:scale-98 animate-gold-glow"
                  >
                    Conheça o Meu Barão
                  </button>
                </div>

                <p className="mt-4 text-center select-none font-serif italic text-sm md:text-base text-zinc-400 font-light tracking-wide max-w-md mx-auto transition-all duration-300 hover:text-white/80">
                  &ldquo;Alguém já fez uma música para você?&rdquo;
                </p>
              </div>
            </section>

            {/* Visual Overview grid displaying core site concepts using Corner Brackets */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto pt-6">
              {/* Escuta Profunda */}
              <div 
                onClick={() => setActiveTab("dialogo")}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Compass className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Escuta Profunda</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Desabafe sobre seu cansaço e preocupações. O Barão sintoniza suas confissões passadas para construir uma memória de carinho e acolhimento contínuo.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Conversar agora 
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>

              {/* Meditação Guiada */}
              <div 
                onClick={() => { setActiveTab("refugio"); setRefugioTab("meditacao"); }}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Headphones className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Meditação Guiada</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Experiências audíveis sussurradas sobre desarmar o estresse, meditações e fantasias guiadas em sinergia com ambientações orgânicas calmas.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Ouvir sessões
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>

              {/* Criação de Músicas */}
              <div 
                onClick={() => { setActiveTab("refugio"); setRefugioTab("composicao"); }}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Music className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Criação de Músicas</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Transforme o peso silencioso de sua essência em canções inéditas. Peça para O Barão compor letras e acordes sob medida para você (Suno AI).
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Compor melodia
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>

              {/* Meu Diário */}
              <div 
                onClick={() => { setActiveTab("refugio"); setRefugioTab("diario"); }}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Scroll className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Meu Diário</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Um registro confidencial e refinado de suas confissões anteriores. O Barão analisa e sintetiza seus sentimentos ao longo da jornada emocional.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Abrir diário
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>

              {/* Studio do Barão */}
              <div 
                onClick={() => { setActiveTab("refugio"); setRefugioTab("historia"); }}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Camera className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Studio do Barão</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Guarde seus momentos e retratos afetivos ao lado do Barão. Reviva memórias poéticas transformadas em crônicas fotográficas ilustradas.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Ver retratos
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>

              {/* Evolução de Sintonia */}
              <div 
                onClick={() => setActiveTab("evolucao")}
                className="group p-6 text-left cursor-pointer bg-[#0F0F0F] border border-white/5 rounded-sm immersive-corners hover:border-barao-rose/40 transition duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-black border border-barao-rose/25 group-hover:bg-barao-rose group-hover:text-black transition-all duration-300">
                  <Coins className="h-5 w-5 text-barao-rose group-hover:text-black" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mt-4">Evolução de Sintonia</h3>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  Gerencie seus planos de sintonia (Grátis, Premium ou Elite), faça upgrades e adquira tokens avulsos para manter sua conexão sem limites.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wider text-barao-rose group-hover:underline">
                  Ver Planos e Tokens
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </section>

            {/* Cozy footer quotes */}
            <div className="pt-12 max-w-xl mx-auto text-center">
              <p className="font-serif text-sm italic text-zinc-400 leading-relaxed">
                Talvez você não precise de mais força. Talvez precise finalmente se permitir sentir.
              </p>
            </div>
          </div>
        )}

        {activeTab === "dialogo" && (
          <div className="w-full h-full flex-grow overflow-hidden animate-fade-in">
            <BaraoChat 
              currentUser={currentUser} 
              onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }} 
              onTabChange={setActiveTab} 
              onUserUpdate={handleUserUpdate}
              baronAvatar={baronAvatar}
            />
          </div>
        )}

        {activeTab === "refugio" && (
          <div className="animate-fade-in py-4 text-left">
            <div className="max-w-5xl mx-auto mb-8">
              <div className="bg-[#0B0B0B]/90 border border-white/5 rounded-sm p-4 sm:p-6 immersive-corners flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-barao-rose block">Santuário de Acolhimento</span>
                  <h2 className="font-serif text-3xl text-white italic font-light">Meu Refúgio</h2>
                </div>
                
                {/* Modern, elegant, mobile-friendly tabs inside Meu Refúgio */}
                <div className="flex flex-wrap w-full md:w-auto gap-2 font-mono text-[10px] uppercase tracking-wider">
                  <button
                    onClick={() => setRefugioTab("diario")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border transition-all duration-300 cursor-pointer flex-1 sm:flex-initial ${
                      refugioTab === "diario"
                        ? "bg-barao-rose border-barao-rose text-black font-semibold shadow-md"
                        : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                    }`}
                  >
                    <Scroll className="h-3.5 w-3.5" />
                    Diário
                  </button>

                  <button
                    onClick={() => setRefugioTab("meditacao")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border transition-all duration-300 cursor-pointer flex-1 sm:flex-initial ${
                      refugioTab === "meditacao"
                        ? "bg-barao-rose border-barao-rose text-black font-semibold shadow-md"
                        : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    Meditação
                  </button>

                  <button
                    onClick={() => setRefugioTab("composicao")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border transition-all duration-300 cursor-pointer flex-1 sm:flex-initial ${
                      refugioTab === "composicao"
                        ? "bg-barao-rose border-barao-rose text-black font-semibold shadow-md"
                        : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                    }`}
                  >
                    <Music className="h-3.5 w-3.5" />
                    Ateliê de Composição
                  </button>

                  <button
                    onClick={() => setRefugioTab("historia")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border transition-all duration-300 cursor-pointer flex-1 sm:flex-initial ${
                      refugioTab === "historia"
                        ? "bg-barao-rose border-barao-rose text-black font-semibold shadow-md"
                        : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                    }`}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Studio do Barão
                  </button>
                </div>
              </div>
            </div>

            {refugioTab === "diario" && (
              <div className="animate-fade-in">
                <BaraoDiary 
                  currentUser={currentUser} 
                  onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }} 
                  onUserUpdate={handleUserUpdate}
                />
              </div>
            )}

            {refugioTab === "meditacao" && (
              <div className="animate-fade-in">
                <AudioTherapy 
                  currentUser={currentUser} 
                  onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }}
                  onUserUpdate={handleUserUpdate}
                  initialSubTab="meditacao"
                  hideSubTabHeader={true}
                />
              </div>
            )}

            {refugioTab === "composicao" && (
              <div className="animate-fade-in">
                <AudioTherapy 
                  currentUser={currentUser} 
                  onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }}
                  onUserUpdate={handleUserUpdate}
                  initialSubTab="composicao"
                  hideSubTabHeader={true}
                />
              </div>
            )}

            {refugioTab === "historia" && (
              <div className="animate-fade-in">
                <BaraoHistory 
                  currentUser={currentUser} 
                  onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }} 
                  onUserUpdate={handleUserUpdate}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "universo" && (
          <div className="animate-fade-in py-4">
            <UserProfilePanel 
              currentUser={currentUser} 
              onTabChange={setActiveTab} 
              onUserUpdate={handleUserUpdate}
              onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }}
            />
          </div>
        )}

        {activeTab === "evolucao" && (
          <div className="animate-fade-in py-4">
            <BaraoEvolucao 
              currentUser={currentUser} 
              onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }}
              onUserUpdate={handleUserUpdate}
            />
          </div>
        )}

        {activeTab === "meubarao" && (
          <div className="animate-fade-in py-4">
            <MeuBarao
              currentUser={currentUser}
              onPromptAuth={() => { setAuthInitialMode("register"); setShowAuthModal(true); }}
              onUserUpdate={handleUserUpdate}
              baronAvatar={baronAvatar}
              onBaronAvatarChange={setBaronAvatar}
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="animate-fade-in py-4">
            <PrivacyPolicyPage onBack={() => setActiveTab("home")} />
          </div>
        )}

        {activeTab === "terms" && (
          <div className="animate-fade-in py-4">
            <TermsOfUsePage onBack={() => setActiveTab("home")} />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="animate-fade-in py-4">
            <BaraoAdminDashboard
              currentUser={currentUser}
              onUserUpdate={handleUserUpdate}
              onBack={() => setActiveTab("home")}
            />
          </div>
        )}
      </main>

      {/* Immersive Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in flex justify-center p-4 sm:p-6 md:p-10">
          <div className="relative w-full max-w-md my-auto">
            {/* Close button with classic gold thin border styling */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white z-50 w-8 h-8 flex items-center justify-center border border-white/5 bg-[#0F0F0F] rounded-sm hover:border-barao-rose/50 cursor-pointer transition focus:outline-none"
            >
              ✕
            </button>
            <BaraoAuth
              initialMode={authInitialMode}
              onSuccess={(user) => {
                setCurrentUser(user);
                // Gentle delay to appreciate the success state
                setTimeout(() => {
                  setShowAuthModal(false);
                }, 1000);
              }}
              onClose={() => setShowAuthModal(false)}
              onViewPrivacy={() => {
                setShowAuthModal(false);
                setActiveTab("privacy");
              }}
              onViewTerms={() => {
                setShowAuthModal(false);
                setActiveTab("terms");
              }}
            />
          </div>
        </div>
      )}
      {/* Global Persistent Footer */}
      {activeTab !== "dialogo" && (
        <footer className="relative z-30 w-full border-t border-white/5 bg-black/75 backdrop-blur-md py-3 sm:py-4 transition-all duration-300">
          <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono tracking-wider text-zinc-500">
            <div className="text-center sm:text-left text-[10px] sm:text-xs">
              <span>Meu Barão v1.1 • Desenvolvido com Verdade Humana</span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3.5 gap-y-2">
              <button
                onClick={() => setActiveTab("privacy")}
                className="text-[10px] uppercase tracking-widest text-[#D9BA7A] hover:text-white transition duration-200 outline-none focus:outline-none cursor-pointer"
              >
                Política de Privacidade
              </button>
              <span className="text-white/10 hidden sm:inline">•</span>
              <button
                onClick={() => setActiveTab("terms")}
                className="text-[10px] uppercase tracking-widest text-[#D9BA7A] hover:text-white transition duration-200 outline-none focus:outline-none cursor-pointer"
              >
                Termos de Uso
              </button>
              <span className="text-white/10 hidden sm:inline">|</span>
              <AmbientMixer />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
