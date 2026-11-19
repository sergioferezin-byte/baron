import crypto from "node:crypto";

/**
 * Integração mínima com o Mercado Pago (Checkout Pro).
 *
 * Fluxo: o servidor cria uma "preferência" com o plano escolhido e devolve
 * o link de pagamento. Depois do pagamento, o Mercado Pago avisa o webhook;
 * o servidor NÃO confia no corpo do aviso: busca o pagamento na API do
 * Mercado Pago com o access token e só ativa o plano se estiver aprovado e
 * com o valor certo.
 */

const API = "https://api.mercadopago.com";

export interface ItemCheckout {
  planoId: string;
  titulo: string;
  preco: number;
}

export async function criarPreferencia(opcoes: {
  accessToken: string;
  item: ItemCheckout;
  email?: string;
  referenciaExterna: string;
  urlBase: string;
  nomeNaFatura?: string;
}): Promise<{ id: string; initPoint: string; sandboxInitPoint: string | null }> {
  const { accessToken, item, email, referenciaExterna, urlBase } = opcoes;
  const resposta = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({
      items: [
        {
          id: item.planoId,
          title: item.titulo,
          quantity: 1,
          unit_price: Number(item.preco.toFixed(2)),
          currency_id: "BRL"
        }
      ],
      payer: email ? { email } : undefined,
      external_reference: referenciaExterna,
      notification_url: `${urlBase}/api/pagamentos/webhook`,
      back_urls: {
        success: `${urlBase}/evolucao?pagamento=aprovado`,
        pending: `${urlBase}/evolucao?pagamento=pendente`,
        failure: `${urlBase}/evolucao?pagamento=falhou`
      },
      auto_return: "approved",
      statement_descriptor: (opcoes.nomeNaFatura || "MEUBARAO").slice(0, 22)
    })
  });

  const dados: any = await resposta.json().catch(() => null);
  if (!resposta.ok || !dados?.init_point) {
    throw new Error(`Mercado Pago recusou a preferência (${resposta.status}): ${JSON.stringify(dados).slice(0, 300)}`);
  }
  return { id: dados.id, initPoint: dados.init_point, sandboxInitPoint: dados.sandbox_init_point || null };
}

export interface PagamentoMp {
  id: string;
  status: string; // approved, pending, rejected, refunded, cancelled...
  valor: number;
  moeda: string;
  referenciaExterna: string | null;
}

export async function buscarPagamento(accessToken: string, id: string): Promise<PagamentoMp> {
  const resposta = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const dados: any = await resposta.json().catch(() => null);
  if (!resposta.ok || !dados) {
    throw new Error(`Mercado Pago não encontrou o pagamento ${id} (${resposta.status})`);
  }
  return {
    id: String(dados.id),
    status: String(dados.status),
    valor: Number(dados.transaction_amount) || 0,
    moeda: String(dados.currency_id || ""),
    referenciaExterna: dados.external_reference || null
  };
}

/**
 * Confere a assinatura do webhook (cabeçalho x-signature) com a "chave
 * secreta" do painel do Mercado Pago. Formato: "ts=...,v1=...".
 */
export function assinaturaWebhookValida(opcoes: {
  segredo: string;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string;
}): boolean {
  const { segredo, xSignature, xRequestId, dataId } = opcoes;
  if (!xSignature) return false;
  const partes = Object.fromEntries(
    xSignature.split(",").map(p => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifesto = `id:${id};`;
  if (xRequestId) manifesto += `request-id:${xRequestId};`;
  manifesto += `ts:${ts};`;

  const esperado = crypto.createHmac("sha256", segredo).update(manifesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Testa o access token (painel admin). */
export async function testarToken(accessToken: string): Promise<{ ok: boolean; detalhe: string }> {
  try {
    const resposta = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const dados: any = await resposta.json().catch(() => null);
    if (!resposta.ok) return { ok: false, detalhe: `HTTP ${resposta.status}` };
    return { ok: true, detalhe: `Conta ${dados?.nickname || dados?.id || "ok"} (${dados?.site_id || "?"})` };
  } catch (err: any) {
    return { ok: false, detalhe: String(err?.message || err) };
  }
}
