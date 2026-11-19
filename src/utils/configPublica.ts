/**
 * Configuração pública do site (planos à venda, manutenção, pagamento),
 * definida no painel admin. Guardada em memória por 30 s.
 */
export interface PlanoPublico {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  periodoDias: number;
  tokens: number;
  nivel: "free" | "premium" | "elite";
  beneficios: string[];
  destaque: boolean;
  mensagensPorDia: number;
}

export interface ConfigPublica {
  manutencao: boolean;
  mensagemManutencao: string;
  planos: PlanoPublico[];
  pagamento: { ativo: boolean; modo: "teste" | "producao"; publicKey: string | null };
  suporte: { email: string; whatsapp: string };
}

let cache: { valor: ConfigPublica; em: number } | null = null;

export async function lerConfigPublica(forcar = false): Promise<ConfigPublica | null> {
  if (!forcar && cache && Date.now() - cache.em < 30_000) return cache.valor;
  try {
    const res = await fetch("/api/config-publica");
    if (!res.ok) return cache?.valor || null;
    const valor = (await res.json()) as ConfigPublica;
    cache = { valor, em: Date.now() };
    return valor;
  } catch {
    return cache?.valor || null;
  }
}
