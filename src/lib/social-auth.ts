import crypto from "node:crypto";

/**
 * Verificação de tokens de login social (Google e Apple) enviados pelo app.
 *
 * O app nativo obtém um id_token (JWT assinado em RS256) do provedor e manda
 * para o servidor. Aqui conferimos assinatura, emissor, público (aud) e
 * validade usando as chaves públicas (JWKS) do próprio provedor — nada vem do
 * body além do token.
 */

type Jwk = crypto.JsonWebKey & { kid?: string };

export interface SocialIdentity {
  email: string;
  emailVerified: boolean;
  name?: string;
  /** Identificador estável do usuário no provedor (claim "sub"). */
  subject: string;
}

interface ProviderConfig {
  nome: string;
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
}

// IDs de cliente são públicos (vão dentro do app). Podem ser trocados por
// variável de ambiente, separados por vírgula, sem mexer no código.
const GOOGLE_CLIENT_IDS_PADRAO = [
  // Cliente "Web" (o app inicializa o plugin com ele no Android e no iOS)
  "1024630213933-5j37m7fcnrps0j7a0of4lgicj7hada40.apps.googleusercontent.com",
  // Cliente "Meu Barão iOS"
  "1024630213933-o3k3f3l0fv4ftcuntaacd61j58d9odnn.apps.googleusercontent.com"
];
const APPLE_CLIENT_IDS_PADRAO = ["br.com.meubarao.app"];

function lista(valor: string | undefined, padrao: string[]): string[] {
  const itens = (valor || "").split(",").map(s => s.trim()).filter(Boolean);
  return itens.length ? itens : padrao;
}

function configGoogle(): ProviderConfig {
  return {
    nome: "Google",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    audiences: lista(process.env.GOOGLE_CLIENT_IDS, GOOGLE_CLIENT_IDS_PADRAO)
  };
}

function configApple(): ProviderConfig {
  return {
    nome: "Apple",
    jwksUrl: "https://appleid.apple.com/auth/keys",
    issuers: ["https://appleid.apple.com"],
    audiences: lista(process.env.APPLE_CLIENT_IDS, APPLE_CLIENT_IDS_PADRAO)
  };
}

export class TokenSocialInvalido extends Error {}

// Cache simples das chaves (a função serverless reaproveita enquanto estiver quente)
const cacheJwks = new Map<string, { chaves: Jwk[]; ate: number }>();

export type BuscarJwks = (url: string) => Promise<Jwk[]>;

const buscarJwksPadrao: BuscarJwks = async url => {
  const agora = Date.now();
  const guardado = cacheJwks.get(url);
  if (guardado && guardado.ate > agora) return guardado.chaves;

  const resposta = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resposta.ok) throw new Error(`JWKS ${url} respondeu ${resposta.status}`);
  const dados = (await resposta.json()) as { keys?: Jwk[] };
  const chaves = dados.keys || [];
  cacheJwks.set(url, { chaves, ate: agora + 60 * 60 * 1000 });
  return chaves;
};

function decodificarBase64Url(parte: string): Buffer {
  return Buffer.from(parte, "base64url");
}

async function verificar(
  idToken: string,
  config: ProviderConfig,
  buscarJwks: BuscarJwks
): Promise<SocialIdentity> {
  const partes = String(idToken || "").split(".");
  if (partes.length !== 3) throw new TokenSocialInvalido("Token malformado.");

  let cabecalho: { alg?: string; kid?: string };
  let corpo: Record<string, any>;
  try {
    cabecalho = JSON.parse(decodificarBase64Url(partes[0]).toString("utf8"));
    corpo = JSON.parse(decodificarBase64Url(partes[1]).toString("utf8"));
  } catch {
    throw new TokenSocialInvalido("Token malformado.");
  }

  // Só RS256: rejeita "none" e troca de algoritmo
  if (cabecalho.alg !== "RS256") throw new TokenSocialInvalido("Algoritmo não aceito.");

  const chaves = await buscarJwks(config.jwksUrl);
  const jwk = chaves.find(k => k.kid === cabecalho.kid);
  if (!jwk) throw new TokenSocialInvalido("Chave de assinatura desconhecida.");

  const publica = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const assinaturaOk = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${partes[0]}.${partes[1]}`),
    publica,
    decodificarBase64Url(partes[2])
  );
  if (!assinaturaOk) throw new TokenSocialInvalido("Assinatura inválida.");

  const agora = Math.floor(Date.now() / 1000);
  if (typeof corpo.exp !== "number" || corpo.exp < agora - 30) {
    throw new TokenSocialInvalido("Token expirado.");
  }
  if (!config.issuers.includes(corpo.iss)) throw new TokenSocialInvalido("Emissor inesperado.");

  const aud = Array.isArray(corpo.aud) ? corpo.aud : [corpo.aud];
  if (!aud.some((a: string) => config.audiences.includes(a))) {
    throw new TokenSocialInvalido("Token emitido para outro aplicativo.");
  }

  if (!corpo.sub) throw new TokenSocialInvalido("Token sem identificação do usuário.");
  if (!corpo.email) throw new TokenSocialInvalido(`O ${config.nome} não informou um e-mail.`);

  return {
    email: String(corpo.email).toLowerCase(),
    // A Apple manda "true"/"false" como texto; o Google, booleano
    emailVerified: corpo.email_verified === true || corpo.email_verified === "true",
    name: typeof corpo.name === "string" ? corpo.name : undefined,
    subject: String(corpo.sub)
  };
}

export function verificarTokenGoogle(idToken: string, buscarJwks: BuscarJwks = buscarJwksPadrao) {
  return verificar(idToken, configGoogle(), buscarJwks);
}

export function verificarTokenApple(idToken: string, buscarJwks: BuscarJwks = buscarJwksPadrao) {
  return verificar(idToken, configApple(), buscarJwks);
}
