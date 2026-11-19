import crypto from "node:crypto";
import { supabaseAdmin } from "./supabase-admin.ts";

/**
 * Configuração do sistema editada pela área admin.
 *
 * Fica num JSON dentro de um bucket PRIVADO do Supabase Storage
 * (barao-config/config.json), e não numa tabela: assim o banco que o app
 * também usa não muda de estrutura. Funciona na Vercel, onde o disco é
 * somente leitura e cada instância tem sua própria memória.
 *
 * Chaves de API e tokens de pagamento são gravados cifrados (AES-256-GCM).
 * A chave de cifra vem de CONFIG_SECRET; sem ela, usamos um hash da
 * SUPABASE_SERVICE_ROLE_KEY. Se essa chave mudar, os segredos gravados
 * precisam ser cadastrados de novo no painel.
 */

const BUCKET = "barao-config";
const ARQUIVO = "config.json";
const CACHE_MS = 30_000;

/** Nível de acesso que o front entende (libera Diário, Ateliê etc.). */
export type NivelPlano = "free" | "premium" | "elite";

export interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number; // em reais
  periodoDias: number; // 30 = mensal; 0 = vitalício (só para o grátis)
  tokens: number; // créditos liberados ao ativar
  mensagensPorDia: number; // 0 = sem limite
  nivel: NivelPlano;
  beneficios: string[];
  destaque: boolean;
  ativo: boolean;
  ordem: number;
}

/** Chaves de serviços de IA que o admin pode trocar sem novo deploy. */
export const CHAVES_IA = [
  "DEEPSEEK_API_KEY",
  "GEMINI_API_KEY",
  "ELEVENLABS_API_KEY",
  "KIE_API_KEY",
  "AZURE_SPEECH_KEY"
] as const;
export type ChaveIa = (typeof CHAVES_IA)[number];

/** Ajustes de modelo e voz (não são segredos). */
export const AJUSTES_IA = [
  "DEEPSEEK_MODEL",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_MODEL",
  "SUNO_MODEL",
  "VISION_MODEL",
  "AZURE_SPEECH_REGION",
  "AZURE_TTS_VOICE"
] as const;
export type AjusteIa = (typeof AJUSTES_IA)[number];

export interface ConfigSistema {
  versao: 1;
  manutencao: boolean;
  mensagemManutencao: string;
  promptSistema: string | null;
  planos: Plano[];
  pagamento: {
    provedor: "mercadopago";
    ativo: boolean;
    modo: "teste" | "producao";
    publicKey: string;
    accessTokenCifrado: string | null;
    webhookSecretCifrado: string | null;
    nomeNaFatura: string;
  };
  ia: {
    chavesCifradas: Partial<Record<ChaveIa, string>>;
    ajustes: Partial<Record<AjusteIa, string>>;
  };
  limites: {
    chat: number;
    voz: number;
    imagem: number;
    musica: number;
    upload: number;
  };
  suporte: { email: string; whatsapp: string };
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

export const PLANOS_PADRAO: Plano[] = [
  {
    id: "free",
    nome: "Plano Grátis",
    descricao: "Para conhecer o Barão: conversa por texto e voz.",
    preco: 0,
    periodoDias: 0,
    tokens: 100,
    mensagensPorDia: 15,
    nivel: "free",
    beneficios: ["Conversa por texto", "Voz do Barão", "Fotos do Barão no chat"],
    destaque: false,
    ativo: true,
    ordem: 0
  },
  {
    id: "premium",
    nome: "Plano Premium",
    descricao: "Diário, meditações, Ateliê de canções e retratos.",
    preco: 29.9,
    periodoDias: 30,
    tokens: 2500,
    mensagensPorDia: 100,
    nivel: "premium",
    beneficios: ["Diário profundo", "Meditação guiada", "Ateliê de canções", "Studio do Barão"],
    destaque: true,
    ativo: true,
    ordem: 1
  },
  {
    id: "elite",
    nome: "Plano Elite",
    descricao: "Tudo sem limites, com prioridade.",
    preco: 69.9,
    periodoDias: 30,
    tokens: 999999,
    mensagensPorDia: 0,
    nivel: "elite",
    beneficios: ["Tudo do Premium", "Canções e fotos sem limite diário", "Atenção prioritária"],
    destaque: false,
    ativo: true,
    ordem: 2
  }
];

export function configPadrao(): ConfigSistema {
  return {
    versao: 1,
    manutencao: false,
    mensagemManutencao: "O Barão está se recolhendo por alguns instantes. Volte em breve.",
    promptSistema: null,
    planos: PLANOS_PADRAO.map(p => ({ ...p, beneficios: [...p.beneficios] })),
    pagamento: {
      provedor: "mercadopago",
      ativo: false,
      modo: "teste",
      publicKey: "",
      accessTokenCifrado: null,
      webhookSecretCifrado: null,
      nomeNaFatura: "MEUBARAO"
    },
    ia: { chavesCifradas: {}, ajustes: {} },
    limites: { chat: 40, voz: 40, imagem: 8, musica: 4, upload: 20 },
    suporte: { email: "sac@meubarao.com", whatsapp: "" },
    atualizadoEm: null,
    atualizadoPor: null
  };
}

// ---------- Cifra ----------

function chaveCifra(): Buffer | null {
  const base = process.env.CONFIG_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  return crypto.createHash("sha256").update(`meu-barao-config:${base}`).digest();
}

export function cifrar(texto: string): string {
  const chave = chaveCifra();
  if (!chave) throw new Error("Defina CONFIG_SECRET para guardar segredos.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chave, iv);
  const dados = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${dados.toString("base64")}`;
}

export function decifrar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const chave = chaveCifra();
  if (!chave) return null;
  try {
    const [versao, iv, tag, dados] = valor.split(":");
    if (versao !== "v1") return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", chave, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dados, "base64")), decipher.final()]).toString("utf8");
  } catch {
    console.error("[Config] Não consegui decifrar um segredo (CONFIG_SECRET mudou?)");
    return null;
  }
}

/** "••••1a2b" para mostrar no painel sem revelar o segredo. */
export function mascarar(segredo: string | null): string | null {
  if (!segredo) return null;
  return `••••${segredo.slice(-4)}`;
}

// ---------- Leitura e gravação ----------

let cache: { config: ConfigSistema; em: number } | null = null;
let bucketPronto = false;

function mesclar(salvo: any): ConfigSistema {
  const padrao = configPadrao();
  if (!salvo || typeof salvo !== "object") return padrao;
  return {
    ...padrao,
    ...salvo,
    versao: 1,
    planos: Array.isArray(salvo.planos) && salvo.planos.length ? salvo.planos : padrao.planos,
    pagamento: { ...padrao.pagamento, ...(salvo.pagamento || {}) },
    ia: {
      chavesCifradas: { ...(salvo.ia?.chavesCifradas || {}) },
      ajustes: { ...(salvo.ia?.ajustes || {}) }
    },
    limites: { ...padrao.limites, ...(salvo.limites || {}) },
    suporte: { ...padrao.suporte, ...(salvo.suporte || {}) }
  };
}

async function garantirBucket() {
  if (bucketPronto || !supabaseAdmin) return;
  // Bucket privado: só o servidor (service role) lê e grava
  await supabaseAdmin.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  bucketPronto = true;
}

export async function lerConfig(forcar = false): Promise<ConfigSistema> {
  if (!forcar && cache && Date.now() - cache.em < CACHE_MS) return cache.config;
  if (!supabaseAdmin) {
    const config = cache?.config || configPadrao();
    cache = { config, em: Date.now() };
    return config;
  }
  try {
    await garantirBucket();
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(ARQUIVO);
    if (error || !data) {
      // Arquivo ainda não existe: usa o padrão até o admin salvar
      const config = cache?.config || configPadrao();
      cache = { config, em: Date.now() };
      return config;
    }
    const config = mesclar(JSON.parse(await data.text()));
    cache = { config, em: Date.now() };
    return config;
  } catch (err) {
    console.error("[Config] Falha ao ler configuração:", err);
    return cache?.config || configPadrao();
  }
}

export async function salvarConfig(config: ConfigSistema, autor: string): Promise<ConfigSistema> {
  const final: ConfigSistema = { ...config, atualizadoEm: new Date().toISOString(), atualizadoPor: autor };
  if (!supabaseAdmin) {
    cache = { config: final, em: Date.now() };
    return final;
  }
  await garantirBucket();
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(ARQUIVO, Buffer.from(JSON.stringify(final, null, 2)), {
      contentType: "application/json",
      upsert: true
    });
  if (error) throw new Error(`Não consegui salvar a configuração: ${error.message}`);
  cache = { config: final, em: Date.now() };
  return final;
}

// ---------- Chaves de IA aplicadas ao processo ----------

// Valores originais das variáveis de ambiente: apagar uma chave no painel
// volta a usar a da Vercel
const ambienteOriginal: Record<string, string | undefined> = {};
for (const nome of [...CHAVES_IA, ...AJUSTES_IA]) {
  ambienteOriginal[nome] = process.env[nome];
}

/**
 * Coloca em process.env as chaves e ajustes salvos no painel (quando
 * houver), por cima das variáveis da Vercel. Chamado antes de cada rota
 * /api, com cache de 30 s.
 */
export function aplicarIaNoAmbiente(config: ConfigSistema) {
  for (const nome of CHAVES_IA) {
    const salvo = decifrar(config.ia.chavesCifradas[nome]);
    const valor = salvo || ambienteOriginal[nome];
    if (valor) process.env[nome] = valor;
    else delete process.env[nome];
  }
  for (const nome of AJUSTES_IA) {
    const salvo = config.ia.ajustes[nome];
    const valor = (typeof salvo === "string" && salvo.trim()) || ambienteOriginal[nome];
    if (valor) process.env[nome] = valor;
    else delete process.env[nome];
  }
}

/** De onde vem cada chave: painel, Vercel ou nenhuma. */
export function origemDasChaves(config: ConfigSistema) {
  const resultado: Record<string, { origem: "painel" | "ambiente" | "nenhuma"; mascara: string | null }> = {};
  for (const nome of CHAVES_IA) {
    const painel = decifrar(config.ia.chavesCifradas[nome]);
    if (painel) resultado[nome] = { origem: "painel", mascara: mascarar(painel) };
    else if (ambienteOriginal[nome]) resultado[nome] = { origem: "ambiente", mascara: mascarar(ambienteOriginal[nome] || null) };
    else resultado[nome] = { origem: "nenhuma", mascara: null };
  }
  return resultado;
}

export function valorAmbienteOriginal(nome: string): string | undefined {
  return ambienteOriginal[nome];
}

export function planoPorId(config: ConfigSistema, id: string | null | undefined): Plano | null {
  if (!id) return null;
  return config.planos.find(p => p.id === id) || null;
}
