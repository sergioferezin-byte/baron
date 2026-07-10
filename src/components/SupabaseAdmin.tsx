import React, { useState, useEffect } from "react";
import { Database, ShieldCheck, Play, Loader2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SupabaseAdmin() {
  const [initStatus, setInitStatus] = useState<"unchecked" | "checking" | "connected" | "empty" | "error">("unchecked");
  const [loading, setLoading] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [serverDiagnostics, setServerDiagnostics] = useState<{
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;
    clientInitialized: boolean;
    testReadTableResult: string | null;
    testAdminUsersResult: string | null;
    errorMsg: string | null;
  } | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Check the active connection of Supabase
  const verifyDatabaseStatus = async () => {
    setInitStatus("checking");
    setConnError(null);
    setDiagLoading(true);
    try {
      if (!supabase) {
        throw new Error("Instância do Supabase não inicializada. Por favor, adicione as chaves no seu ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).");
      }

      // Test connection by fetching session
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      setInitStatus("connected");

      // Fetch server diagnostics
      try {
        const diagRes = await fetch("/api/auth/test-supabase");
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setServerDiagnostics(diagData);
        }
      } catch (diagErr) {
        console.warn("Could not fetch server diagnostics:", diagErr);
      }
    } catch (error: any) {
      console.error("Supabase status check failed:", error);
      setInitStatus("error");
      setConnError(error instanceof Error ? error.message : String(error));
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    verifyDatabaseStatus();
  }, []);

  return (
    <div id="supabase-admin-widget" className="mt-8 bg-[#0C0B0A] border border-white/5 rounded-sm p-6 max-w-2xl mx-auto text-left immersive-corners relative overflow-hidden">
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
              Instâncias e Tabelas do Supabase
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {initStatus === "checking" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
              <Loader2 className="h-3 w-3 animate-spin text-barao-rose" />
              Sincronizando...
            </span>
          )}
          {initStatus === "connected" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono text-[9px] uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" />
              Supabase Ativo
            </span>
          )}
          {initStatus === "empty" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-amber-950/40 border border-amber-800/40 text-amber-400 font-mono text-[9px] uppercase tracking-wider">
              <AlertCircle className="h-3 w-3" />
              Não sintonizado
            </span>
          )}
          {initStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-rose-950/40 border border-rose-800/40 text-rose-400 font-mono text-[9px] uppercase tracking-wider">
              <AlertCircle className="h-3 w-3" />
              Instabilidade
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 text-xs leading-relaxed font-serif text-zinc-400">
        <p>
          O Barão agora sintoniza sua biografia e suas conversas de forma segura na nuvem através do <strong className="text-white font-medium">Supabase</strong>. Suas crônicas poéticas, desabafos e memórias semânticas permanecem estruturadas no PostgreSQL.
        </p>

        {connError && (
          <div className="p-3 border border-rose-900/30 bg-rose-950/10 rounded-sm text-rose-400 flex items-start gap-2.5 font-mono text-[10px] uppercase tracking-wide">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Erro de Conexão:</p>
              <p className="normal-case font-sans text-xs text-zinc-400">{connError}</p>
            </div>
          </div>
        )}

        {serverDiagnostics && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3 font-mono text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-white uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-barao-rose" />
              Diagnóstico do Servidor (Supabase Sync)
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed bg-black/30 p-3 rounded-sm border border-white/5">
              <div>
                <span className="text-zinc-500">SUPABASE_URL:</span> <span className="text-white">{serverDiagnostics.supabaseUrl}</span>
              </div>
              <div>
                <span className="text-zinc-500">ANON_KEY (Público):</span> <span className="text-white">{serverDiagnostics.supabaseAnonKey}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-zinc-500">SERVICE_ROLE_KEY (Mestre/Servidor):</span>{" "}
                {serverDiagnostics.supabaseServiceRoleKey.includes("not set") ? (
                  <span className="text-rose-400 font-bold">NÃO CONFIGURADO (Faltando!)</span>
                ) : (
                  <span className="text-emerald-400">{serverDiagnostics.supabaseServiceRoleKey}</span>
                )}
              </div>
            </div>

            <div className="space-y-2 bg-black/20 p-3 rounded-sm border border-white/5">
              <div>
                <span className="text-zinc-500">Acesso ao Banco (Tabela 'usuarios'):</span>{" "}
                {serverDiagnostics.testReadTableResult?.includes("Success") ? (
                  <span className="text-emerald-400 font-semibold">{serverDiagnostics.testReadTableResult}</span>
                ) : (
                  <span className="text-rose-400">{serverDiagnostics.testReadTableResult || "Sem resposta"}</span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-zinc-500">Criação de Usuários (Supabase Auth):</span>{" "}
                {serverDiagnostics.testAdminUsersResult?.includes("Success") ? (
                  <span className="text-emerald-400 font-semibold">{serverDiagnostics.testAdminUsersResult}</span>
                ) : (
                  <span className="text-rose-400">{serverDiagnostics.testAdminUsersResult || "Sem resposta"}</span>
                )}
              </div>
            </div>

            {(!serverDiagnostics.testAdminUsersResult || serverDiagnostics.testAdminUsersResult.includes("Error") || serverDiagnostics.supabaseServiceRoleKey.includes("not set")) && (
              <div className="p-4 border border-amber-500/25 bg-amber-500/5 rounded-sm text-amber-300 font-sans text-xs space-y-2.5 leading-relaxed">
                <p className="font-semibold flex items-center gap-1.5 uppercase tracking-wide text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  Sua Chave Mestra (service_role) Não Está Configurada!
                </p>
                <p>
                  Para que o cadastro de novos usuários seja salvo automaticamente no <strong className="text-white">Authentication (lista de usuários)</strong> do seu Supabase, você precisa configurar a chave mestre de administração do seu projeto (<strong className="text-white">service_role</strong>). Como fazer:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-zinc-300 font-sans">
                  <li>
                    Acesse o painel do seu projeto no <strong className="text-white">Supabase</strong> (<a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-400 hover:text-amber-300 font-medium">supabase.com</a>).
                  </li>
                  <li>
                    Abra as configurações do projeto (<strong className="text-white">Project Settings</strong>) e clique na aba <strong className="text-white">API</strong>.
                  </li>
                  <li>
                    Role até a seção <strong className="text-white">Project API Keys</strong> e copie o valor da chave rotulada como <strong className="text-white">service_role (secret)</strong> (começa com <code className="bg-black/50 px-1 py-0.5 rounded text-white font-mono">eyJ...</code>). <em className="text-amber-400">Não use a chave 'anon' pública!</em>
                  </li>
                  <li>
                    No canto inferior esquerdo do seu painel do <strong className="text-white">Google AI Studio Build</strong>, clique nas engrenagens de <strong className="text-white">Settings</strong>, depois no menu <strong className="text-white">Secrets</strong>.
                  </li>
                  <li>
                    Adicione uma nova variável chamada <strong className="text-white">SUPABASE_SERVICE_ROLE_KEY</strong> colando essa chave de administração.
                  </li>
                  <li>
                    Após salvar, clique em <strong className="text-white">Recarregar Status</strong> abaixo para sintonizar a nuvem do Barão!
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-white/5 flex flex-wrap gap-3 items-center justify-between">
          <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
            Status local: {supabase ? "Instanciado" : "Simulado"}
          </span>

          <button
            onClick={verifyDatabaseStatus}
            disabled={loading || initStatus === "checking" || diagLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 active:bg-white/5 rounded-sm font-sans text-xs text-white transition disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loading || initStatus === "checking" || diagLoading ? "animate-spin" : ""}`} />
            Recarregar Status
          </button>
        </div>
      </div>
    </div>
  );
}
