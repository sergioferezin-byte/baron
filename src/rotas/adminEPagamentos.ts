import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  assinaturas,
  carteirasCreditos,
  composicoesMusicais,
  conversas,
  mensagens,
  usuarios
} from "../db/schema.ts";
import { requireAdmin, identificarAdmin, adminConfigurado, type AdminRequest } from "../middleware/adminAuth.ts";
import { requireAuth, type AuthRequest } from "../middleware/auth.ts";
import { limiteDeUso } from "../middleware/limiteDeUso.ts";
import {
  AJUSTES_IA,
  CHAVES_IA,
  cifrar,
  decifrar,
  lerConfig,
  mascarar,
  origemDasChaves,
  planoPorId,
  salvarConfig,
  valorAmbienteOriginal,
  type ConfigSistema,
  type NivelPlano,
  type Plano
} from "../lib/configSistema.ts";
import { ativarPlano, cancelarPlano, planoAtualDe } from "../lib/assinaturas.ts";
import {
  assinaturaWebhookValida,
  buscarPagamento,
  criarPreferencia,
  testarToken
} from "../lib/mercadoPago.ts";

/**
 * Rotas da área admin (protegidas por requireAdmin), da configuração
 * pública (planos e manutenção) e do pagamento com Mercado Pago.
 */

const NIVEIS: NivelPlano[] = ["free", "premium", "elite"];

function texto(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

function inteiro(valor: unknown, min: number, max: number, padrao: number): number {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

function normalizarPlano(corpo: any, idFixo?: string): Plano | string {
  const id = idFixo || texto(corpo?.id, 30).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(id)) {
    return "O código do plano precisa ter de 2 a 30 letras minúsculas, números ou hífen (ex.: premium-anual).";
  }
  const nome = texto(corpo?.nome, 60);
  if (!nome) return "Dê um nome ao plano.";
  const preco = Math.round(Number(corpo?.preco) * 100) / 100;
  if (!Number.isFinite(preco) || preco < 0 || preco > 100000) return "Preço inválido.";
  const nivel = NIVEIS.includes(corpo?.nivel) ? (corpo.nivel as NivelPlano) : null;
  if (!nivel) return "Escolha o nível de acesso: free, premium ou elite.";
  if (id !== "free" && preco === 0 && nivel !== "free") {
    return "Planos pagos precisam de preço maior que zero.";
  }
  const beneficios = Array.isArray(corpo?.beneficios)
    ? corpo.beneficios.map((b: unknown) => texto(b, 120)).filter(Boolean).slice(0, 12)
    : [];
  return {
    id,
    nome,
    descricao: texto(corpo?.descricao, 300),
    preco,
    periodoDias: inteiro(corpo?.periodoDias, 0, 3650, 30),
    tokens: inteiro(corpo?.tokens, 0, 10_000_000, 0),
    mensagensPorDia: inteiro(corpo?.mensagensPorDia, 0, 100_000, 0),
    nivel,
    beneficios,
    destaque: !!corpo?.destaque,
    ativo: corpo?.ativo !== false,
    ordem: inteiro(corpo?.ordem, 0, 999, 0)
  };
}

/** Configuração para o painel: segredos só aparecem mascarados. */
function configParaPainel(config: ConfigSistema, promptPadrao: string) {
  const accessToken = decifrar(config.pagamento.accessTokenCifrado);
  return {
    manutencao: config.manutencao,
    mensagemManutencao: config.mensagemManutencao,
    promptSistema: config.promptSistema,
    promptPadrao,
    planos: [...config.planos].sort((a, b) => a.ordem - b.ordem),
    pagamento: {
      provedor: config.pagamento.provedor,
      ativo: config.pagamento.ativo,
      modo: config.pagamento.modo,
      publicKey: config.pagamento.publicKey,
      nomeNaFatura: config.pagamento.nomeNaFatura,
      accessToken: mascarar(accessToken),
      webhookSecretConfigurado: !!decifrar(config.pagamento.webhookSecretCifrado)
    },
    ia: {
      chaves: origemDasChaves(config),
      ajustes: Object.fromEntries(
        AJUSTES_IA.map(nome => [
          nome,
          { painel: config.ia.ajustes[nome] || "", ambiente: valorAmbienteOriginal(nome) || "" }
        ])
      )
    },
    limites: config.limites,
    suporte: config.suporte,
    atualizadoEm: config.atualizadoEm,
    atualizadoPor: config.atualizadoPor,
    ambiente: {
      configSecret: !!process.env.CONFIG_SECRET,
      adminEmails: (process.env.ADMIN_EMAILS || "").split(",").filter(s => s.trim()).length,
      appUrl: process.env.APP_URL || null
    }
  };
}

function urlBase(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  return `${proto}://${req.headers.host}`;
}

async function testarServicoIa(servico: string): Promise<{ ok: boolean; detalhe: string }> {
  const env = process.env;
  try {
    switch (servico) {
      case "DEEPSEEK_API_KEY": {
        if (!env.DEEPSEEK_API_KEY) return { ok: false, detalhe: "Sem chave." };
        const r = await fetch("https://api.deepseek.com/user/balance", {
          headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` }
        });
        const d: any = await r.json().catch(() => null);
        if (!r.ok) return { ok: false, detalhe: `HTTP ${r.status}` };
        const saldo = d?.balance_infos?.[0];
        return { ok: true, detalhe: saldo ? `Saldo: ${saldo.total_balance} ${saldo.currency}` : "Chave válida" };
      }
      case "GEMINI_API_KEY": {
        if (!env.GEMINI_API_KEY) return { ok: false, detalhe: "Sem chave." };
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(env.GEMINI_API_KEY)}`
        );
        return r.ok ? { ok: true, detalhe: "Chave válida" } : { ok: false, detalhe: `HTTP ${r.status}` };
      }
      case "ELEVENLABS_API_KEY": {
        if (!env.ELEVENLABS_API_KEY) return { ok: false, detalhe: "Sem chave." };
        const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
          headers: { "xi-api-key": env.ELEVENLABS_API_KEY }
        });
        const d: any = await r.json().catch(() => null);
        if (!r.ok) return { ok: false, detalhe: `HTTP ${r.status}` };
        return {
          ok: true,
          detalhe: `Plano ${d?.tier || "?"}: ${d?.character_count ?? "?"} de ${d?.character_limit ?? "?"} caracteres usados`
        };
      }
      case "KIE_API_KEY": {
        if (!env.KIE_API_KEY) return { ok: false, detalhe: "Sem chave." };
        const r = await fetch("https://api.kie.ai/api/v1/chat/credit", {
          headers: { Authorization: `Bearer ${env.KIE_API_KEY}` }
        });
        const d: any = await r.json().catch(() => null);
        if (!r.ok || (d?.code && d.code !== 200)) return { ok: false, detalhe: `HTTP ${r.status} ${d?.msg || ""}`.trim() };
        return { ok: true, detalhe: `Créditos: ${d?.data ?? "?"}` };
      }
      case "AZURE_SPEECH_KEY": {
        if (!env.AZURE_SPEECH_KEY) return { ok: false, detalhe: "Sem chave." };
        const regiao = env.AZURE_SPEECH_REGION || "brazilsouth";
        const r = await fetch(`https://${regiao}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
          method: "POST",
          headers: { "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY, "Content-Length": "0" }
        });
        return r.ok ? { ok: true, detalhe: `Chave válida (${regiao})` } : { ok: false, detalhe: `HTTP ${r.status}` };
      }
      default:
        return { ok: false, detalhe: "Serviço desconhecido." };
    }
  } catch (err: any) {
    return { ok: false, detalhe: String(err?.message || err) };
  }
}

export function registrarRotasAdminEPagamentos(app: Express, deps: { promptPadrao: string }) {
  // Express 4 não captura erro de função async: sem isto, uma falha no banco
  // derrubaria o servidor inteiro. Toda rota daqui passa por este envelope.
  const envolver = (fn: any) =>
    typeof fn !== "function" || fn.length > 3
      ? fn
      : (req: Request, res: Response, next: (err?: unknown) => void) => {
          Promise.resolve(fn(req, res, next)).catch(err => {
            console.error(`[Rota ${req.method} ${req.path}] Falhou:`, err);
            if (!res.headersSent) res.status(500).json({ error: "Algo falhou no servidor. Tente de novo em instantes." });
          });
        };
  const rotas = {
    get: (caminho: string, ...h: any[]) => app.get(caminho, ...h.map(envolver)),
    post: (caminho: string, ...h: any[]) => app.post(caminho, ...h.map(envolver)),
    put: (caminho: string, ...h: any[]) => app.put(caminho, ...h.map(envolver)),
    delete: (caminho: string, ...h: any[]) => app.delete(caminho, ...h.map(envolver))
  };

  // ---------- Público ----------

  // Planos à venda, manutenção e se o pagamento está ligado. Nada secreto.
  rotas.get("/api/config-publica", async (_req, res) => {
    const config = await lerConfig();
    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({
      manutencao: config.manutencao,
      mensagemManutencao: config.mensagemManutencao,
      planos: config.planos
        .filter(p => p.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .map(({ id, nome, descricao, preco, periodoDias, tokens, nivel, beneficios, destaque, mensagensPorDia }) => ({
          id,
          nome,
          descricao,
          preco,
          periodoDias,
          tokens,
          nivel,
          beneficios,
          destaque,
          mensagensPorDia
        })),
      pagamento: {
        ativo: config.pagamento.ativo && !!config.pagamento.accessTokenCifrado,
        modo: config.pagamento.modo,
        publicKey: config.pagamento.publicKey || null
      },
      suporte: config.suporte
    });
  });

  // ---------- Pagamento (Mercado Pago) ----------

  rotas.get("/api/pagamentos/meu-plano", requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ error: "Entre na conta." });
    const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.uid, uid)).limit(1);
    if (!u) return res.status(404).json({ error: "Conta não encontrada." });
    const [carteira] = await db.select().from(carteirasCreditos).where(eq(carteirasCreditos.usuarioId, u.id)).limit(1);
    res.json({ ...(await planoAtualDe(u.id)), tokens: carteira?.tokensDisponiveis ?? 0 });
  });

  rotas.post(
    "/api/pagamentos/checkout",
    limiteDeUso({ nome: "checkout", maximo: 10, janelaMs: 10 * 60 * 1000, mensagem: "Muitas tentativas. Espere alguns minutos." }),
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user?.id;
        if (!uid) return res.status(401).json({ error: "Entre na conta para assinar." });

        const config = await lerConfig();
        const accessToken = decifrar(config.pagamento.accessTokenCifrado);
        if (!config.pagamento.ativo || !accessToken) {
          return res.status(503).json({ error: "Os pagamentos ainda não estão abertos. Tente mais tarde." });
        }

        const plano = planoPorId(config, texto(req.body?.planoId, 30));
        if (!plano || !plano.ativo || plano.preco <= 0) {
          return res.status(400).json({ error: "Plano indisponível." });
        }

        const [u] = await db.select().from(usuarios).where(eq(usuarios.uid, uid)).limit(1);
        if (!u) return res.status(404).json({ error: "Conta não encontrada." });

        const referencia = `u:${u.id}|p:${plano.id}|n:${crypto.randomBytes(6).toString("hex")}`;
        const pref = await criarPreferencia({
          accessToken,
          item: { planoId: plano.id, titulo: `Meu Barão — ${plano.nome}`, preco: plano.preco },
          email: u.email,
          referenciaExterna: referencia,
          urlBase: urlBase(req),
          nomeNaFatura: config.pagamento.nomeNaFatura
        });

        const link = config.pagamento.modo === "teste" && pref.sandboxInitPoint ? pref.sandboxInitPoint : pref.initPoint;
        res.json({ url: link, preferenciaId: pref.id });
      } catch (err: any) {
        console.error("[Pagamento] Checkout falhou:", err);
        res.status(502).json({ error: "Não consegui abrir o pagamento agora. Tente de novo em instantes." });
      }
    }
  );

  // Aviso do Mercado Pago. Sempre confirma o pagamento na API antes de ativar.
  rotas.post("/api/pagamentos/webhook", async (req, res) => {
    try {
      const tipo = String(req.query.type || req.query.topic || req.body?.type || "");
      const dataId = String(req.query["data.id"] || req.body?.data?.id || req.query.id || "");
      if (tipo !== "payment" || !dataId) return res.status(200).json({ ignorado: true });

      const config = await lerConfig(true);
      const accessToken = decifrar(config.pagamento.accessTokenCifrado);
      if (!accessToken) return res.status(200).json({ ignorado: "sem token" });

      const segredo = decifrar(config.pagamento.webhookSecretCifrado);
      if (segredo) {
        const valida = assinaturaWebhookValida({
          segredo,
          xSignature: req.headers["x-signature"] as string | undefined,
          xRequestId: req.headers["x-request-id"] as string | undefined,
          dataId
        });
        if (!valida) {
          console.warn("[Pagamento] Webhook com assinatura inválida para", dataId);
          return res.status(401).json({ error: "assinatura inválida" });
        }
      }

      const pagamento = await buscarPagamento(accessToken, dataId);
      if (pagamento.status !== "approved") return res.status(200).json({ status: pagamento.status });

      const ref = Object.fromEntries(
        String(pagamento.referenciaExterna || "")
          .split("|")
          .map(p => p.split(":") as [string, string])
      );
      const usuarioId = Number(ref.u);
      const plano = planoPorId(config, ref.p);
      if (!usuarioId || !plano) {
        console.error("[Pagamento] Referência desconhecida:", pagamento.referenciaExterna);
        return res.status(200).json({ ignorado: "referência" });
      }
      if (pagamento.moeda !== "BRL" || pagamento.valor + 0.01 < plano.preco) {
        console.error("[Pagamento] Valor não confere:", pagamento.valor, plano.preco);
        return res.status(200).json({ ignorado: "valor" });
      }

      const { jaExistia } = await ativarPlano(usuarioId, plano, `mp:${pagamento.id}`);
      console.log(`[Pagamento] Plano ${plano.id} ${jaExistia ? "já estava ativo" : "ativado"} para usuário ${usuarioId}`);
      res.status(200).json({ ativado: !jaExistia });
    } catch (err) {
      console.error("[Pagamento] Webhook falhou:", err);
      // 500 faz o Mercado Pago tentar de novo mais tarde
      res.status(500).json({ error: "falha temporária" });
    }
  });

  // ---------- Admin ----------

  const limiteAdmin = limiteDeUso({
    nome: "admin",
    maximo: 120,
    janelaMs: 10 * 60 * 1000,
    mensagem: "Muitas tentativas na área admin. Espere alguns minutos."
  });
  app.use("/api/admin", limiteAdmin);

  // Diz ao front se quem está logado é admin (sem erro quando não é)
  rotas.get("/api/admin/sessao", async (req, res) => {
    if (!adminConfigurado()) return res.json({ admin: false, configurado: false });
    const admin = await identificarAdmin(req);
    res.json({ admin: !!admin, configurado: true, email: admin?.email || null, via: admin?.via || null });
  });

  rotas.get("/api/admin/config", requireAdmin, async (_req, res) => {
    res.json(configParaPainel(await lerConfig(true), deps.promptPadrao));
  });

  rotas.put("/api/admin/config/geral", requireAdmin, async (req: AdminRequest, res) => {
    const config = await lerConfig(true);
    const corpo = req.body || {};
    if (typeof corpo.manutencao === "boolean") config.manutencao = corpo.manutencao;
    if (typeof corpo.mensagemManutencao === "string") {
      config.mensagemManutencao = texto(corpo.mensagemManutencao, 300) || config.mensagemManutencao;
    }
    if (corpo.promptSistema !== undefined) {
      const prompt = typeof corpo.promptSistema === "string" ? corpo.promptSistema.trim() : "";
      config.promptSistema = prompt && prompt !== deps.promptPadrao.trim() ? prompt.slice(0, 40_000) : null;
    }
    if (corpo.limites && typeof corpo.limites === "object") {
      for (const nome of ["chat", "voz", "imagem", "musica", "upload"] as const) {
        if (corpo.limites[nome] !== undefined) {
          config.limites[nome] = inteiro(corpo.limites[nome], 1, 10_000, config.limites[nome]);
        }
      }
    }
    if (corpo.suporte && typeof corpo.suporte === "object") {
      config.suporte = {
        email: texto(corpo.suporte.email, 120) || config.suporte.email,
        whatsapp: texto(corpo.suporte.whatsapp, 30)
      };
    }
    const salvo = await salvarConfig(config, req.admin!.email);
    res.json(configParaPainel(salvo, deps.promptPadrao));
  });

  rotas.put("/api/admin/config/pagamento", requireAdmin, async (req: AdminRequest, res) => {
    try {
      const config = await lerConfig(true);
      const corpo = req.body || {};
      const p = config.pagamento;
      if (corpo.modo === "teste" || corpo.modo === "producao") p.modo = corpo.modo;
      if (typeof corpo.publicKey === "string") p.publicKey = texto(corpo.publicKey, 200);
      if (typeof corpo.nomeNaFatura === "string") p.nomeNaFatura = texto(corpo.nomeNaFatura, 22) || "MEUBARAO";
      // "" = manter; null = apagar; texto = trocar
      if (corpo.accessToken === null) p.accessTokenCifrado = null;
      else if (typeof corpo.accessToken === "string" && corpo.accessToken.trim()) {
        p.accessTokenCifrado = cifrar(corpo.accessToken.trim());
      }
      if (corpo.webhookSecret === null) p.webhookSecretCifrado = null;
      else if (typeof corpo.webhookSecret === "string" && corpo.webhookSecret.trim()) {
        p.webhookSecretCifrado = cifrar(corpo.webhookSecret.trim());
      }
      if (typeof corpo.ativo === "boolean") {
        if (corpo.ativo && !p.accessTokenCifrado) {
          return res.status(400).json({ error: "Cadastre o Access Token antes de ligar os pagamentos." });
        }
        p.ativo = corpo.ativo;
      }
      const salvo = await salvarConfig(config, req.admin!.email);
      res.json(configParaPainel(salvo, deps.promptPadrao));
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Falha ao salvar." });
    }
  });

  rotas.post("/api/admin/config/pagamento/testar", requireAdmin, async (_req, res) => {
    const config = await lerConfig(true);
    const token = decifrar(config.pagamento.accessTokenCifrado);
    if (!token) return res.json({ ok: false, detalhe: "Nenhum Access Token cadastrado." });
    res.json(await testarToken(token));
  });

  rotas.put("/api/admin/config/ia", requireAdmin, async (req: AdminRequest, res) => {
    try {
      const config = await lerConfig(true);
      const chaves = req.body?.chaves || {};
      const ajustes = req.body?.ajustes || {};
      for (const nome of CHAVES_IA) {
        if (chaves[nome] === null) delete config.ia.chavesCifradas[nome];
        else if (typeof chaves[nome] === "string" && chaves[nome].trim()) {
          config.ia.chavesCifradas[nome] = cifrar(chaves[nome].trim());
        }
      }
      for (const nome of AJUSTES_IA) {
        if (ajustes[nome] === null || ajustes[nome] === "") delete config.ia.ajustes[nome];
        else if (typeof ajustes[nome] === "string") config.ia.ajustes[nome] = texto(ajustes[nome], 120);
      }
      const salvo = await salvarConfig(config, req.admin!.email);
      res.json(configParaPainel(salvo, deps.promptPadrao));
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Falha ao salvar." });
    }
  });

  rotas.post("/api/admin/config/ia/testar", requireAdmin, async (req, res) => {
    res.json(await testarServicoIa(String(req.body?.servico || "")));
  });

  // Planos
  rotas.post("/api/admin/planos", requireAdmin, async (req: AdminRequest, res) => {
    const plano = normalizarPlano(req.body);
    if (typeof plano === "string") return res.status(400).json({ error: plano });
    const config = await lerConfig(true);
    if (config.planos.some(p => p.id === plano.id)) {
      return res.status(409).json({ error: "Já existe um plano com esse código." });
    }
    config.planos.push(plano);
    const salvo = await salvarConfig(config, req.admin!.email);
    res.json(configParaPainel(salvo, deps.promptPadrao));
  });

  rotas.put("/api/admin/planos/:id", requireAdmin, async (req: AdminRequest, res) => {
    const config = await lerConfig(true);
    const indice = config.planos.findIndex(p => p.id === req.params.id);
    if (indice < 0) return res.status(404).json({ error: "Plano não encontrado." });
    const plano = normalizarPlano(req.body, req.params.id);
    if (typeof plano === "string") return res.status(400).json({ error: plano });
    if (plano.id === "free") {
      plano.preco = 0;
      plano.nivel = "free";
      plano.ativo = true;
    }
    config.planos[indice] = plano;
    const salvo = await salvarConfig(config, req.admin!.email);
    res.json(configParaPainel(salvo, deps.promptPadrao));
  });

  rotas.delete("/api/admin/planos/:id", requireAdmin, async (req: AdminRequest, res) => {
    if (req.params.id === "free") {
      return res.status(400).json({ error: "O plano grátis não pode ser apagado (é o plano de quem não assina)." });
    }
    const config = await lerConfig(true);
    const antes = config.planos.length;
    config.planos = config.planos.filter(p => p.id !== req.params.id);
    if (config.planos.length === antes) return res.status(404).json({ error: "Plano não encontrado." });

    // Quem já pagou continua com o acesso até o fim do período
    const ativos = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(assinaturas)
      .where(and(eq(assinaturas.planoAtual, req.params.id), eq(assinaturas.status, "ativa")));
    const salvo = await salvarConfig(config, req.admin!.email);
    res.json({ ...configParaPainel(salvo, deps.promptPadrao), assinantesAtivos: ativos[0]?.total || 0 });
  });

  // Resumo
  rotas.get("/api/admin/resumo", requireAdmin, async (_req, res) => {
    const contar = async (tabela: any, filtro?: any) => {
      const q = db.select({ total: sql<number>`count(*)::int` }).from(tabela);
      const [r] = await (filtro ? q.where(filtro) : q);
      return r?.total || 0;
    };
    const [totalUsuarios, totalConversas, totalMensagens, totalCancoes, assinantes] = await Promise.all([
      contar(usuarios),
      contar(conversas),
      contar(mensagens),
      contar(composicoesMusicais),
      contar(assinaturas, eq(assinaturas.status, "ativa"))
    ]);
    const novos7d = await contar(usuarios, sql`${usuarios.createdAt} > now() - interval '7 days'`);
    res.json({ totalUsuarios, novos7d, totalConversas, totalMensagens, totalCancoes, assinantes });
  });

  // Usuárias
  rotas.get("/api/admin/usuarios", requireAdmin, async (req, res) => {
    const busca = texto(req.query.busca, 100);
    const pagina = inteiro(req.query.pagina, 1, 10_000, 1);
    const porPagina = 25;
    const filtro = busca
      ? or(ilike(usuarios.email, `%${busca}%`), ilike(usuarios.nomeCompleto, `%${busca}%`))
      : undefined;

    const base = db
      .select({
        id: usuarios.id,
        uid: usuarios.uid,
        email: usuarios.email,
        nome: usuarios.nomeCompleto,
        apelido: usuarios.apelido,
        criadoEm: usuarios.createdAt,
        tokens: carteirasCreditos.tokensDisponiveis
      })
      .from(usuarios)
      .leftJoin(carteirasCreditos, eq(carteirasCreditos.usuarioId, usuarios.id));
    const lista = await (filtro ? base.where(filtro) : base)
      .orderBy(desc(usuarios.createdAt))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina);

    const ids = lista.map(u => u.id);
    const subs = ids.length
      ? await db
          .select()
          .from(assinaturas)
          .where(and(inArray(assinaturas.usuarioId, ids), eq(assinaturas.status, "ativa")))
      : [];
    const agora = Date.now();
    const planoDe = new Map<number, { planoId: string; ate: string | null; origem: string }>();
    for (const s of subs) {
      if (s.dataFim && new Date(s.dataFim).getTime() < agora) continue;
      planoDe.set(s.usuarioId, {
        planoId: String(s.planoAtual),
        ate: s.dataFim ? new Date(s.dataFim).toISOString() : null,
        origem: String(s.stripeSubscriptionId || "").split(":")[0] || "manual"
      });
    }

    res.json({
      pagina,
      porPagina,
      usuarios: lista.map(u => ({ ...u, plano: planoDe.get(u.id) || { planoId: "free", ate: null, origem: "gratis" } }))
    });
  });

  rotas.post("/api/admin/usuarios/:id/plano", requireAdmin, async (req: AdminRequest, res) => {
    const usuarioId = Number(req.params.id);
    const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
    if (!u) return res.status(404).json({ error: "Usuária não encontrada." });

    const planoId = texto(req.body?.planoId, 30);
    if (planoId === "free") {
      await cancelarPlano(usuarioId);
      return res.json({ ok: true, planoId: "free" });
    }
    const config = await lerConfig();
    const plano = planoPorId(config, planoId);
    if (!plano) return res.status(400).json({ error: "Plano inexistente." });
    const dias = inteiro(req.body?.dias, 1, 3650, plano.periodoDias || 30);
    await ativarPlano(usuarioId, plano, `manual:${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, dias);
    res.json({ ok: true, planoId: plano.id, dias });
  });

  rotas.post("/api/admin/usuarios/:id/tokens", requireAdmin, async (req, res) => {
    const usuarioId = Number(req.params.id);
    const tokens = inteiro(req.body?.tokens, 0, 10_000_000, 0);
    await db
      .insert(carteirasCreditos)
      .values({ usuarioId, tokensDisponiveis: tokens })
      .onConflictDoUpdate({
        target: carteirasCreditos.usuarioId,
        set: { tokensDisponiveis: tokens, ultimaRecarga: new Date(), updatedAt: new Date() }
      });
    res.json({ ok: true, tokens });
  });

  // Pagamentos e assinaturas recentes
  rotas.get("/api/admin/assinaturas", requireAdmin, async (_req, res) => {
    const linhas = await db
      .select({
        id: assinaturas.id,
        planoId: assinaturas.planoAtual,
        status: assinaturas.status,
        referencia: assinaturas.stripeSubscriptionId,
        inicio: assinaturas.dataInicio,
        fim: assinaturas.dataFim,
        email: usuarios.email,
        nome: usuarios.nomeCompleto
      })
      .from(assinaturas)
      .innerJoin(usuarios, eq(usuarios.id, assinaturas.usuarioId))
      .orderBy(desc(assinaturas.dataInicio))
      .limit(100);
    res.json({ assinaturas: linhas });
  });
}
