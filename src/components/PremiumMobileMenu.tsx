import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import BaraoLogo from "./BaraoLogo";
import { 
  Compass, 
  Headphones, 
  Scroll, 
  Camera, 
  Sparkles, 
  Heart, 
  X as CloseIcon, 
  LogIn, 
  LogOut,
  Coins,
  Home,
  User as UserIcon
} from "lucide-react";
import { User } from "../types";

type ActiveTab = "home" | "dialogo" | "refugio" | "universo" | "evolucao" | "meubarao";

interface PremiumMobileMenuProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onLogout: () => void;
  onSintonizar: () => void;
  userAvatar?: string;
  renderAvatarSvgOrImg: (avatarUrl: string | undefined, letter: string, className: string) => React.ReactNode;
}

export default function PremiumMobileMenu({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onSintonizar,
  userAvatar,
  renderAvatarSvgOrImg
}: PremiumMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sync scroll lock with mobile viewport safely
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuItems = [
    { 
      id: "home" as ActiveTab, 
      label: "Início", 
      num: "I", 
      desc: "Retorne ao salão de entrada", 
      icon: Heart 
    },
    { 
      id: "dialogo" as ActiveTab, 
      label: "Diálogo", 
      num: "II", 
      desc: "Vulnerabilidade sob escuta atenta", 
      icon: Compass 
    },
    { 
      id: "refugio" as ActiveTab, 
      label: "Meu Refúgio", 
      num: "III", 
      desc: "Seu porto de abrigo e santuário físico", 
      icon: Home 
    },
    { 
      id: "universo" as ActiveTab, 
      label: "Meu Universo", 
      num: "IV", 
      desc: "Sua órbita pessoal e afinidades", 
      icon: Sparkles 
    },
    { 
      id: "meubarao" as ActiveTab, 
      label: "Meu Barão", 
      num: "V", 
      desc: "Sua fisionomia, sintonias de canal e tom de voz", 
      icon: UserIcon 
    },
    { 
      id: "evolucao" as ActiveTab, 
      label: "Evolução", 
      num: "VI", 
      desc: "Planos, upgrades e recargas de sintonia", 
      icon: Coins 
    }
  ];

  return (
    <div className="lg:hidden flex items-center">
      {/* 1. Mobile Menu Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2.5 px-4 py-2 border border-barao-rose bg-black/80 hover:border-white transition-all duration-200 rounded-sm active:scale-95 group cursor-pointer z-35"
        aria-label="Abrir menu"
      >
        <span className="font-mono text-xs tracking-[0.2em] text-white uppercase pt-0.5 select-none font-bold">
          Menu
        </span>
        <div className="flex flex-col gap-1 w-4 items-end">
          <span className="h-[1.5px] bg-barao-rose block w-4 transition-all" />
          <span className="h-[1.5px] bg-barao-rose block w-2.5 group-hover:w-4 transition-all duration-200" />
        </div>
      </button>

      {/* 2. Full-Screen Drawer Overlay Portal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end w-full h-full overflow-hidden">
          {/* Backdrop screen */}
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Drawer Right-Hand Panel */}
          <div className="relative w-full max-w-[340px] xs:max-w-[380px] bg-[#0E0D0C] border-l border-barao-rose/30 h-full min-h-full flex flex-col shadow-2xl z-55 overflow-hidden">
            {/* Elegant corner bracket layouts overlay for maximum branding value */}
            <div className="absolute inset-3 border border-barao-rose/10 pointer-events-none immersive-corners opacity-75 rounded-xs z-0" />

            {/* A. Fixed Top Header */}
            <div className="relative z-10 flex items-center justify-between p-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <BaraoLogo className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h2 className="font-serif text-[12px] font-semibold tracking-[0.15em] text-white uppercase leading-none">
                    Meu Barão
                  </h2>
                  <span className="block font-mono text-[7px] text-barao-rose uppercase tracking-[0.2em] mt-1">
                    Voz e Presença
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-sm border border-barao-rose/40 hover:border-white hover:bg-barao-rose/10 text-white transition-all duration-150 cursor-pointer active:scale-95 text-xs font-mono uppercase tracking-wider bg-black/40"
                aria-label="Fechar menu"
              >
                <span>Fechar</span>
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* B. Scrollable inner section with clean heights */}
            <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-none">
              
              {/* Navigation Link Stack */}
              <nav className="flex flex-col space-y-4">
                {menuItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const IconComponent = item.icon;

                  return (
                    <div 
                      key={item.id} 
                      className="flex items-start shrink-0 border-b border-white/[0.05] pb-3 last:border-0"
                    >
                      {/* Roman index */}
                      <div className="font-mono text-xs text-barao-rose/60 tracking-wider w-8 pt-1 shrink-0 select-none text-left">
                        {item.num}
                      </div>

                      {/* Click target helper */}
                      <div className="flex-1 text-left">
                        <button
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsOpen(false);
                          }}
                          className="text-left group/nav relative block w-full focus:outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {IconComponent && (
                              <IconComponent 
                                className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover/nav:scale-110 ${
                                  isActive ? "text-barao-gold" : "text-barao-rose"
                                }`} 
                              />
                            )}
                            <span className={`font-serif text-[18px] tracking-wide transition-colors duration-150 ${
                              isActive 
                                ? "text-barao-gold font-bold underline decoration-barao-rose decoration-2 underline-offset-4" 
                                : "text-white group-hover/nav:text-barao-gold"
                            }`}>
                              {item.label}
                            </span>

                            {isActive && (
                              <span className="w-2 h-2 rounded-full bg-barao-rose animate-pulse" />
                            )}
                          </div>

                          <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-zinc-400 mt-1 pl-1 group-hover/nav:text-zinc-200 transition-colors">
                            {item.desc}
                          </p>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </nav>

              {/* Authentication Section */}
              <div className="pt-4 border-t border-white/10 shrink-0">
                {currentUser ? (
                  <div className="flex items-center justify-between bg-black/60 border border-barao-rose/30 p-3.5 rounded-sm gap-2.5">
                    <div className="flex items-center gap-2.5">
                      {renderAvatarSvgOrImg(
                        userAvatar, 
                        (currentUser.nickname || currentUser.name || "U").slice(0, 1), 
                        "w-8 h-8 rounded-sm border border-barao-rose/30"
                      )}
                      <div className="text-left">
                        <span className="block font-serif text-xs font-semibold text-white leading-none">
                          {currentUser.nickname || currentUser.name}
                        </span>
                        <span className="block font-mono text-[7px] text-barao-rose uppercase tracking-[0.1em] mt-1 leading-none">
                          Abrigo Interno
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        onLogout();
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1.5 border border-white/10 hover:border-rose-950 hover:bg-rose-950/15 hover:text-red-300 transition-all text-[8px] uppercase font-mono tracking-wider rounded-sm text-zinc-300 bg-black/40 flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <LogOut className="h-3 w-3 shrink-0" />
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 bg-[#111111]/60 border border-barao-rose/40 p-4 rounded-sm">
                    <div className="text-left">
                      <span className="block font-serif text-xs italic text-barao-gold">
                        Sintonize seu abrigo pessoal
                      </span>
                      <span className="block font-mono text-[8px] text-zinc-300 uppercase tracking-[0.08em] mt-1 line-clamp-2 leading-relaxed">
                        Guarde depoimentos em diário, sessões de áudio e confidências seguras.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSintonizar();
                        setIsOpen(false);
                      }}
                      className="w-full px-3 py-2 border border-barao-rose text-barao-rose hover:bg-barao-rose hover:text-black transition-all duration-200 text-[10px] uppercase font-mono tracking-[0.1em] font-bold rounded-sm bg-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <LogIn className="h-3.5 w-3.5 shrink-0" />
                      <span>Sintonizar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* C. Fixed Bottom Footer Stamp */}
            <div className="relative z-10 p-6 pt-2 border-t border-white/10 shrink-0 text-center bg-[#0E0D0C]">
              <p className="font-serif italic text-[11px] text-barao-rose/80">
                &ldquo;Não é um chatbot. É uma presença.&rdquo;
              </p>
              <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-[#C5A059]/55 mt-1.5 select-none">
                O Barão © Voz • Memória Afetiva
              </p>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
