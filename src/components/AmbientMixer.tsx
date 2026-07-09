/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { synther } from "../utils/audioSynthesizer";
import { Music, CloudRain, Flame, Volume2, Sparkles, VolumeX } from "lucide-react";

export default function AmbientMixer({ 
  dropdownPosition = "top",
  isMobileSquare = false
}: { 
  dropdownPosition?: "top" | "bottom";
  isMobileSquare?: boolean;
}) {
  const [isPianoOn, setIsPianoOn] = useState(false);
  const [isRainOn, setIsRainOn] = useState(false);
  const [isFireOn, setIsFireOn] = useState(false);

  const [pianoVol, setPianoVol] = useState(0.4);
  const [rainVol, setRainVol] = useState(0.3);
  const [fireVol, setFireVol] = useState(0.3);

  const [isMutedAll, setIsMutedAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Synchronize playing states
  useEffect(() => {
    if (isMutedAll) {
      synther.stopPiano();
      synther.stopRain();
      synther.stopFire();
    } else {
      if (isPianoOn) synther.startPiano(pianoVol);
      else synther.stopPiano();

      if (isRainOn) synther.startRain(rainVol);
      else synther.stopRain();

      if (isFireOn) synther.startFire(fireVol);
      else synther.stopFire();
    }
  }, [isPianoOn, isRainOn, isFireOn, isMutedAll]);

  // Synchronize volume sliders
  useEffect(() => {
    if (!isMutedAll && isPianoOn) synther.setPianoVolume(pianoVol);
  }, [pianoVol, isPianoOn, isMutedAll]);

  useEffect(() => {
    if (!isMutedAll && isRainOn) synther.setRainVolume(rainVol);
  }, [rainVol, isRainOn, isMutedAll]);

  useEffect(() => {
    if (!isMutedAll && isFireOn) synther.setFireVolume(fireVol);
  }, [fireVol, isFireOn, isMutedAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synther.stopPiano();
      synther.stopRain();
      synther.stopFire();
    };
  }, []);

  const toggleMuteAll = () => {
    synther.initContext();
    setIsMutedAll(!isMutedAll);
  };

  const hasAnyActive = isPianoOn || isRainOn || isFireOn;
  const isPlaying = hasAnyActive && !isMutedAll;

  const buttonClasses = isMobileSquare 
    ? `flex h-8 w-8 items-center justify-center rounded-sm border transition-all duration-300 transform active:scale-95 ${
        isPlaying
          ? "bg-rose-950/30 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)] animate-pulse"
          : "bg-[#121110]/60 border-[#C5A059]/30 text-[#E5CD9D] hover:text-white hover:bg-[#181614]"
      }`
    : `flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border shadow-md focus:outline-none focus:ring-1 focus:ring-barao-rose/30 ${
        isPlaying
          ? "bg-barao-rose/95 border-barao-rose text-black animate-pulse shadow-[0_0_12px_rgba(203,134,132,0.4)]"
          : "bg-[#101010] border-[#c5a059]/40 text-[#c5a059] hover:bg-barao-plum hover:border-barao-rose/60 hover:text-white"
      }`;

  return (
    <div id="ambient-soundscape" className="relative inline-flex flex-col items-end font-sans">
      {isOpen && (
        <div className={`absolute ${dropdownPosition === "top" ? "bottom-full mb-3" : "top-full mt-3"} right-0 w-72 rounded-sm border border-barao-rose/25 bg-barao-deep/95 p-5 shadow-2xl backdrop-blur-xl animate-fade-in transition-all duration-300 immersive-corners z-55`}>
          <div className="mb-4 flex items-center justify-between border-b border-barao-rose/15 pb-2">
            <h4 className="flex items-center gap-1.5 font-serif text-sm font-medium text-barao-gold">
              <Sparkles className="h-4 w-4 text-barao-rose" />
              Dopamina Sensorial
            </h4>
            <button
              onClick={toggleMuteAll}
              className={`rounded-sm p-1.5 transition ${
                isMutedAll
                  ? "bg-rose-950/40 text-rose-300 border border-rose-900/30"
                  : "bg-barao-plum/40 text-barao-gold hover:bg-barao-plum/80"
              }`}
              title={isMutedAll ? "Ativar Áudio" : "Mutar Tudo"}
            >
              {isMutedAll ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <p className="mb-4 text-left text-[11px] leading-relaxed text-zinc-400">
            Combine sons programados em tempo real para embalar sua jornada emocional.
          </p>

          <div className="space-y-4">
            {/* Piano Synthesizer */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    synther.initContext();
                    setIsPianoOn(!isPianoOn);
                  }}
                  className={`flex items-center gap-2 rounded-sm px-2 py-1 text-xs font-medium transition ${
                    isPianoOn && !isMutedAll
                      ? "bg-emerald-950/30 text-emerald-300 border border-emerald-500/20"
                      : "bg-[#141414] text-zinc-400 border border-white/5"
                  }`}
                >
                  <Music className="h-3.5 w-3.5" />
                  Piano Sutil
                </button>
                <span className="text-[10px] text-zinc-500">{isPianoOn && !isMutedAll ? `${Math.round(pianoVol * 100)}%` : "Desligado"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={pianoVol}
                onChange={(e) => setPianoVol(parseFloat(e.target.value))}
                disabled={!isPianoOn || isMutedAll}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-barao-rose disabled:opacity-30"
              />
            </div>

            {/* Rain Filter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    synther.initContext();
                    setIsRainOn(!isRainOn);
                  }}
                  className={`flex items-center gap-2 rounded-sm px-2 py-1 text-xs font-medium transition ${
                    isRainOn && !isMutedAll
                      ? "bg-blue-950/30 text-blue-300 border border-blue-500/20"
                      : "bg-[#141414] text-zinc-400 border border-white/5"
                  }`}
                >
                  <CloudRain className="h-3.5 w-3.5" />
                  Chuva do Silêncio
                </button>
                <span className="text-[10px] text-zinc-500">{isRainOn && !isMutedAll ? `${Math.round(rainVol * 100)}%` : "Desligado"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={rainVol}
                onChange={(e) => setRainVol(parseFloat(e.target.value))}
                disabled={!isRainOn || isMutedAll}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-barao-rose disabled:opacity-30"
              />
            </div>

            {/* Fire Crackling */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    synther.initContext();
                    setIsFireOn(!isFireOn);
                  }}
                  className={`flex items-center gap-2 rounded-sm px-2 py-1 text-xs font-medium transition ${
                    isFireOn && !isMutedAll
                      ? "bg-amber-950/30 text-amber-300 border border-amber-500/20"
                      : "bg-[#141414] text-zinc-400 border border-white/5"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  Lareira Quente
                </button>
                <span className="text-[10px] text-zinc-500">{isFireOn && !isMutedAll ? `${Math.round(fireVol * 100)}%` : "Desligado"}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={fireVol}
                onChange={(e) => setFireVol(parseFloat(e.target.value))}
                disabled={!isFireOn || isMutedAll}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-barao-rose disabled:opacity-30"
              />
            </div>
          </div>
          
          <div className="mt-3.5 border-t border-barao-rose/10 pt-2.5 text-center">
            <p className="text-[9px] text-barao-rose/60 font-mono tracking-wider">
              {isPlaying ? "🔊 FONES ALTAMENTE RECOMENDADOS" : "🔇 AUDIO SENSOR OPERAL INATIVO"}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          synther.initContext();
          setIsOpen(!isOpen);
        }}
        className={buttonClasses}
        title="Dopamina Sensorial - Som de Fundo"
      >
        <Music className={`${isMobileSquare ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} shrink-0 ${isPlaying ? "animate-spin duration-[3000ms]" : ""}`} />
        {!isMobileSquare && (
          <>
            <span className="hidden sm:inline">
              {isPlaying ? "Sons Ativos" : "Som de Fundo"}
            </span>
            {isPlaying && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
