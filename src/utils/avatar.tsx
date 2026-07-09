import React from "react";

export function getPresetBgClass(avatarUrl: string | undefined): string {
  if (!avatarUrl || !avatarUrl.startsWith("preset:")) return "";
  const preset = avatarUrl.replace("preset:", "");
  if (preset === "night") return "bg-gradient-to-tr from-[#051125] via-[#0b2145] to-[#1a3a6e]";
  if (preset === "nebula") return "bg-gradient-to-tr from-[#190a2a] via-[#331550] to-[#552780]";
  if (preset === "gold") return "bg-gradient-to-tr from-[#1f1b0a] via-[#3a3214] to-[#605221]";
  if (preset === "smoke") return "bg-gradient-to-tr from-[#121212] via-[#242424] to-[#404040]";
  // velvet and default fallback
  return "bg-gradient-to-tr from-[#3a0614] via-[#5c0d23] to-[#8c183b]";
}

export function renderAvatarSvgOrImg(avatarUrl: string | undefined, initials: string, className = "w-8 h-8 rounded-full") {
  if (!avatarUrl) {
    return (
      <div className={`${className} bg-black border border-barao-rose/45 flex items-center justify-center text-barao-rose font-mono text-xs uppercase select-none`}>
        {initials}
      </div>
    );
  }
  
  if (avatarUrl.startsWith("preset:")) {
    const gradientClass = getPresetBgClass(avatarUrl);
    return (
      <div className={`${className} ${gradientClass} border border-white/10 flex items-center justify-center text-white/90 font-mono text-xs uppercase shadow-inner relative overflow-hidden select-none`}>
        <span className="relative z-10">{initials}</span>
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
      </div>
    );
  }
  
  return (
    <img 
      src={avatarUrl} 
      alt="Retrato" 
      referrerPolicy="no-referrer"
      className={`${className} object-cover border border-white/10`}
    />
  );
}
