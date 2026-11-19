import { Request, Response, NextFunction } from "express";

/**
 * Limite de uso por IP para as rotas que gastam créditos pagos (ElevenLabs,
 * kie.ai). Essas rotas aceitam visitantes sem conta, então o limite é o que
 * impede alguém de esvaziar os créditos com chamadas em série.
 *
 * A contagem fica na memória da instância: na Vercel cada instância conta
 * separado, então o limite é aproximado. Ainda assim barra rajadas, que é o
 * abuso mais comum.
 */
interface Janela {
  inicio: number;
  total: number;
}

function ipDaRequisicao(req: Request): string {
  const encaminhado = req.headers["x-forwarded-for"];
  const primeiro = Array.isArray(encaminhado) ? encaminhado[0] : encaminhado;
  if (primeiro) return primeiro.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "desconhecido";
}

export function limiteDeUso(opcoes: {
  nome: string;
  maximo: number;
  janelaMs: number;
  mensagem: string;
}) {
  const contagens = new Map<string, Janela>();

  return (req: Request, res: Response, next: NextFunction) => {
    const agora = Date.now();
    const ip = ipDaRequisicao(req);

    // Limpeza ocasional para o mapa não crescer sem fim
    if (contagens.size > 5000) {
      for (const [chave, janela] of contagens) {
        if (agora - janela.inicio > opcoes.janelaMs) contagens.delete(chave);
      }
    }

    let janela = contagens.get(ip);
    if (!janela || agora - janela.inicio > opcoes.janelaMs) {
      janela = { inicio: agora, total: 0 };
      contagens.set(ip, janela);
    }

    janela.total += 1;
    if (janela.total > opcoes.maximo) {
      const esperaSegundos = Math.ceil((janela.inicio + opcoes.janelaMs - agora) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, esperaSegundos)));
      console.warn(`[Limite ${opcoes.nome}] ${ip} passou de ${opcoes.maximo} pedidos`);
      return res.status(429).json({ error: opcoes.mensagem });
    }

    next();
  };
}
