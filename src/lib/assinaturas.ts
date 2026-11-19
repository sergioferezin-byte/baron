import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { assinaturas, carteirasCreditos } from "../db/schema.ts";
import { lerConfig, planoPorId, type NivelPlano, type Plano } from "./configSistema.ts";

/**
 * Plano da usuária, decidido pelo servidor.
 *
 * A fonte da verdade é a tabela `assinaturas` (já existente): uma linha com
 * status "ativa" e data_fim no futuro (ou sem data_fim) vale como plano
 * atual. O campo `plan` que o navegador mandava no perfil é ignorado.
 *
 * Reuso de colunas, sem mudar a estrutura do banco:
 *  - plano_atual           → id do plano (ex.: "premium")
 *  - status                → "ativa" | "cancelada" | "pendente" | "expirada"
 *  - stripe_subscription_id → identificador do pagamento, prefixado:
 *                            "mp:<id do pagamento>" ou "manual:<data>"
 */

export interface PlanoDaUsuaria {
  planoId: string;
  planoNome: string;
  nivel: NivelPlano;
  ate: string | null;
  origem: "gratis" | "mercadopago" | "manual";
}

export async function planoAtualDe(usuarioId: number): Promise<PlanoDaUsuaria> {
  const config = await lerConfig();
  const gratis = planoPorId(config, "free");
  const padrao: PlanoDaUsuaria = {
    planoId: "free",
    planoNome: gratis?.nome || "Plano Grátis",
    nivel: "free",
    ate: null,
    origem: "gratis"
  };

  try {
    const linhas = await db
      .select()
      .from(assinaturas)
      .where(and(eq(assinaturas.usuarioId, usuarioId), eq(assinaturas.status, "ativa")))
      .orderBy(desc(assinaturas.dataInicio))
      .limit(5);

    const agora = Date.now();
    for (const linha of linhas) {
      if (linha.dataFim && new Date(linha.dataFim).getTime() < agora) continue;
      const plano = planoPorId(config, linha.planoAtual);
      // Plano apagado do painel: mantém o nível pelo id conhecido
      const nivel: NivelPlano =
        plano?.nivel || (["premium", "elite"].includes(String(linha.planoAtual)) ? (linha.planoAtual as NivelPlano) : "free");
      return {
        planoId: String(linha.planoAtual),
        planoNome: plano?.nome || String(linha.planoAtual),
        nivel,
        ate: linha.dataFim ? new Date(linha.dataFim).toISOString() : null,
        origem: String(linha.stripeSubscriptionId || "").startsWith("mp:") ? "mercadopago" : "manual"
      };
    }
  } catch (err) {
    console.error("[Assinaturas] Falha ao ler plano:", err);
  }
  return padrao;
}

/**
 * Ativa um plano: encerra a assinatura anterior, grava a nova e libera os
 * créditos do plano na carteira. Idempotente pelo `referencia` (o mesmo
 * pagamento avisado duas vezes pelo webhook não ativa duas vezes).
 */
export async function ativarPlano(
  usuarioId: number,
  plano: Plano,
  referencia: string,
  diasOverride?: number
): Promise<{ jaExistia: boolean }> {
  const [existente] = await db
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.stripeSubscriptionId, referencia))
    .limit(1);
  if (existente) return { jaExistia: true };

  const dias = diasOverride ?? plano.periodoDias;
  const inicio = new Date();
  const fim = dias > 0 ? new Date(inicio.getTime() + dias * 24 * 60 * 60 * 1000) : null;

  await db
    .update(assinaturas)
    .set({ status: "substituida", updatedAt: new Date() })
    .where(and(eq(assinaturas.usuarioId, usuarioId), eq(assinaturas.status, "ativa")));

  await db.insert(assinaturas).values({
    usuarioId,
    planoAtual: plano.id,
    status: "ativa",
    stripeSubscriptionId: referencia,
    dataInicio: inicio,
    dataFim: fim
  });

  await db
    .insert(carteirasCreditos)
    .values({ usuarioId, tokensDisponiveis: plano.tokens, ultimaRecarga: new Date() })
    .onConflictDoUpdate({
      target: carteirasCreditos.usuarioId,
      set: { tokensDisponiveis: plano.tokens, ultimaRecarga: new Date(), updatedAt: new Date() }
    });

  return { jaExistia: false };
}

/** Volta a usuária para o plano grátis (cancelamento manual pelo admin). */
export async function cancelarPlano(usuarioId: number) {
  await db
    .update(assinaturas)
    .set({ status: "cancelada", dataFim: new Date(), updatedAt: new Date() })
    .where(and(eq(assinaturas.usuarioId, usuarioId), eq(assinaturas.status, "ativa")));
}
