/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Database, ShieldCheck, Play, Loader2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { seedFirestoreCollections, isFirestoreSeeded, SeedingResult } from "../lib/seeder";
import { db } from "../lib/firebase";
import { doc, getDocFromServer } from "firebase/firestore";

export default function FirestoreAdmin() {
  const [initStatus, setInitStatus] = useState<"unchecked" | "checking" | "seeded" | "empty" | "error">("unchecked");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedingResult | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  // Check the active connection and seed status of Firestore
  const verifyDatabaseStatus = async () => {
    setInitStatus("checking");
    setConnError(null);
    setResult(null);
    try {
      if (!db) {
        throw new Error("Instância do Firestore não inicializada. Por favor, adicione as chaves no menu Settings (VITE_FIREBASE_API_KEY) do AI Studio correspondentes ao seu projeto 'meubarao-b049c'.");
      }
      // 1. Try to fetch a mock document from server directly to test connection
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (err: any) {
        // "the client is offline" or missing auth isn't necessarily a hard database failures,
        // but if we get a network connection error, we catch it
        if (err instanceof Error && err.message.includes("offline")) {
          throw new Error("Não foi possível conectar ao servidor do Firestore. Verifique se o cliente está online.");
        }
      }

      // 2. Check if catalogs are already seeded
      const seeded = await isFirestoreSeeded();
      if (seeded) {
        setInitStatus("seeded");
      } else {
        setInitStatus("empty");
      }
    } catch (error: any) {
      console.error("Firestore status check failed:", error);
      setInitStatus("error");
      setConnError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    verifyDatabaseStatus();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    setConnError(null);
    setResult(null);
    try {
      const res = await seedFirestoreCollections();
      setResult(res);
      if (res.success) {
        setInitStatus("seeded");
      } else {
        setInitStatus("error");
        setConnError(res.message + (res.details ? `: ${res.details}` : ""));
      }
    } catch (err: any) {
      setInitStatus("error");
      setConnError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="firestore-admin-widget" className="mt-8 bg-[#0C0B0A] border border-white/5 rounded-sm p-6 max-w-2xl mx-auto text-left immersive-corners relative overflow-hidden">
      {/* Decorative accent lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-barao-rose/20 to-transparent" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-barao-rose/25 bg-barao-rose/5 rounded-sm">
            <Database className="h-5 w-5 text-barao-rose" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold tracking-wide text-white uppercase">
              Sintonização de Banco de Dados
            </h4>
            <span className="block font-mono text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">
              Instâncias e Coleções Globais do Firestore
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {initStatus === "checking" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
              <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
              Verificando...
            </span>
          )}
          {initStatus === "seeded" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold">
              <ShieldCheck className="h-3 w-3" />
              Sinfonia Ativa
            </span>
          )}
          {initStatus === "empty" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#FFA500]/10 border border-[#FFA505]/25 text-[#FFA500] font-mono text-[9px] uppercase tracking-wider">
              <AlertCircle className="h-3 w-3 animate-pulse" />
              Coleções Vazias
            </span>
          )}
          {initStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-red-950/20 border border-red-500/25 text-red-400 font-mono text-[9px] uppercase tracking-wider">
              <AlertCircle className="h-3 w-3" />
              Falha de Conexão
            </span>
          )}
          
          <button
            onClick={verifyDatabaseStatus}
            disabled={initStatus === "checking" || loading}
            className="p-1 border border-white/5 bg-black hover:border-barao-rose/25 rounded-sm transition text-zinc-500 hover:text-white"
            title="Atualizar Status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${initStatus === "checking" ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="font-serif text-zinc-400 text-xs italic leading-relaxed">
          O Firestore organiza o fluxo de dados em coleções inteligentes de acordo com as especificações do sistema. Para que recursos como planos, recursos (features), fotos de avatares e vozes funcionem, os catálogos precisam ser populados.
        </p>

        {/* Display connection error if any */}
        {connError && (
          <div className="flex items-start gap-2.5 rounded-sm bg-red-950/20 border border-red-900/30 p-4 text-xs text-red-300">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-400" />
            <div className="space-y-1">
              <span className="font-bold block">Status do Ambiente:</span>
              <p className="leading-relaxed font-mono text-[10px]">
                {connError}
              </p>
              <p className="font-serif italic text-zinc-500 mt-2 text-[10px] leading-relaxed">
                Dica: Certifique-se de configurar as chaves de acesso no menu Settings (VITE_FIREBASE_API_KEY) do AI Studio para sincronizar seu projeto real `{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'meubarao-b049c'}`.
              </p>
            </div>
          </div>
        )}

        {/* Seeding outcome statistics */}
        {result && result.success && result.counts && (
          <div className="flex items-start gap-3 rounded-sm bg-emerald-950/25 border border-emerald-900/30 p-4 text-xs text-emerald-300">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400 animate-bounce" />
            <div className="space-y-1">
              <span className="font-serif font-bold text-sm text-white block">Semeado com Sucesso!</span>
              <p className="leading-relaxed">
                As tabelas globais do Firestore foram inicializadas e sincronizadas com sucesso.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-3 font-mono text-[10px] text-zinc-300">
                <div className="bg-black/40 border border-white/5 p-2 rounded-sm text-center">
                  <span className="text-zinc-500 uppercase text-[8px] block">Planos / Tiers</span>
                  <span className="text-white font-bold">{result.counts.plans} Gravados</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-2 rounded-sm text-center">
                  <span className="text-zinc-500 uppercase text-[8px] block">Recursos (Features)</span>
                  <span className="text-white font-bold">{result.counts.features} Gravados</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-2 rounded-sm text-center">
                  <span className="text-zinc-500 uppercase text-[8px] block">Avatares do Retrato</span>
                  <span className="text-white font-bold">{result.counts.avatars} Gravados</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-2 rounded-sm text-center">
                  <span className="text-zinc-500 uppercase text-[8px] block">Canais de Vozes</span>
                  <span className="text-white font-bold">{result.counts.voiceProfiles} Gravados</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full sm:w-auto h-10 px-5 bg-barao-rose hover:bg-barao-gold text-black text-xs font-bold uppercase tracking-wider transition-all rounded-sm flex items-center justify-center gap-2 pr-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Semeando...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Popular Coleções Globais (Seeder)</span>
              </>
            )}
          </button>

          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide italic">
            {initStatus === "seeded" 
              ? "Catálogos sintonizados. Você já pode rodá-los novamente para atualizar os dados." 
              : "Gera coleções do Firestore com todos os parâmetros originais sem apagar dados do usuário."}
          </span>
        </div>
      </div>
    </div>
  );
}
