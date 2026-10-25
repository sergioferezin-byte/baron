/**
 * Foto e vídeo no chat da web.
 *
 * O navegador não manda o arquivo original: a foto é reduzida e recomprimida
 * aqui, e o vídeo é resumido em alguns quadros (o Barão "olha" esses quadros)
 * mais o arquivo, que sobe direto para o Storage pela URL assinada.
 */

const LADO_MAXIMO = 1440;
const QUALIDADE_FOTO = 0.82;
const LADO_QUADRO = 960;
const QUALIDADE_QUADRO = 0.72;

/** Limite do servidor para o corpo do vídeo (25 MB). */
export const LIMITE_VIDEO = 25 * 1024 * 1024;

export interface MidiaChat {
  tipo: "foto" | "video";
  /** Foto: imagem pronta. Vídeo: o arquivo enviado. */
  url: string;
  /** Capa do vídeo, usada como miniatura e no player. */
  posterUrl?: string;
  /** Quadros do vídeo que o Barão conseguiu ver. */
  frames?: string[];
  duracao?: number;
  nome?: string;
  largura?: number;
  altura?: number;
}

export interface FotoPreparada {
  dataUrl: string;
  largura: number;
  altura: number;
  bytes: number;
}

export interface VideoPreparado {
  duracao: number;
  largura: number;
  altura: number;
  poster: string;
  quadros: string[];
}

function esperarEvento(
  alvo: HTMLVideoElement | HTMLImageElement,
  evento: string,
  tempoLimite = 15000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let pronto = false;
    const fim = (erro?: Error) => {
      if (pronto) return;
      pronto = true;
      window.clearTimeout(vigia);
      alvo.removeEventListener(evento, aoConcluir);
      if (erro) reject(erro);
      else resolve();
    };
    const aoConcluir = () => fim();
    const vigia = window.setTimeout(
      () => fim(new Error(`Tempo esgotado à espera de ${evento}`)),
      tempoLimite
    );
    alvo.addEventListener(evento, aoConcluir, { once: true });
  });
}

function desenharEmJpeg(
  fonte: CanvasImageSource,
  largura: number,
  altura: number,
  ladoMaximo: number,
  qualidade: number
): string {
  const escala = Math.min(1, ladoMaximo / Math.max(largura, altura));
  const larguraFinal = Math.max(1, Math.round(largura * escala));
  const alturaFinal = Math.max(1, Math.round(altura * escala));

  const tela = document.createElement("canvas");
  tela.width = larguraFinal;
  tela.height = alturaFinal;
  const pincel = tela.getContext("2d");
  if (!pincel) throw new Error("O navegador não conseguiu preparar a imagem.");
  pincel.drawImage(fonte, 0, 0, larguraFinal, alturaFinal);
  return tela.toDataURL("image/jpeg", qualidade);
}

/** Abre a foto já corrigindo a rotação que a câmera grava no arquivo. */
async function abrirFoto(
  arquivo: File
): Promise<{ fonte: CanvasImageSource; largura: number; altura: number; liberar: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
      return {
        fonte: bitmap,
        largura: bitmap.width,
        altura: bitmap.height,
        liberar: () => bitmap.close()
      };
    } catch {
      // Navegadores antigos não aceitam a opção; cai para o <img>
    }
  }

  const url = URL.createObjectURL(arquivo);
  const imagem = new Image();
  imagem.decoding = "async";
  const carregou = esperarEvento(imagem, "load", 20000);
  imagem.src = url;
  try {
    await carregou;
  } catch (erro) {
    URL.revokeObjectURL(url);
    throw erro;
  }
  return {
    fonte: imagem,
    largura: imagem.naturalWidth,
    altura: imagem.naturalHeight,
    liberar: () => URL.revokeObjectURL(url)
  };
}

/** Reduz a foto para no máximo 1440 px no lado maior. */
export async function comprimirFoto(arquivo: File): Promise<FotoPreparada> {
  const aberta = await abrirFoto(arquivo);
  try {
    const dataUrl = desenharEmJpeg(
      aberta.fonte,
      aberta.largura,
      aberta.altura,
      LADO_MAXIMO,
      QUALIDADE_FOTO
    );
    const base64 = dataUrl.split(",")[1] || "";
    return {
      dataUrl,
      largura: aberta.largura,
      altura: aberta.altura,
      bytes: Math.floor((base64.length * 3) / 4)
    };
  } finally {
    aberta.liberar();
  }
}

/** Leva o vídeo até o instante pedido e espera a imagem ficar pronta. */
function irPara(video: HTMLVideoElement, instante: number): Promise<void> {
  return new Promise(resolve => {
    let pronto = false;
    const fim = () => {
      if (pronto) return;
      pronto = true;
      window.clearTimeout(vigia);
      video.removeEventListener("seeked", fim);
      resolve();
    };
    const vigia = window.setTimeout(fim, 5000);
    video.addEventListener("seeked", fim, { once: true });
    try {
      const limite =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.max(0, video.duration - 0.08)
          : instante;
      video.currentTime = Math.min(Math.max(0.01, instante), limite);
    } catch {
      fim();
    }
  });
}

/** Extrai capa e dois quadros do vídeo, além da duração. */
export async function analisarVideo(arquivo: File): Promise<VideoPreparado> {
  const url = URL.createObjectURL(arquivo);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.load();

  try {
    await esperarEvento(video, "loadeddata", 20000);
    const duracao = Number.isFinite(video.duration) ? video.duration : 0;
    const largura = video.videoWidth || 720;
    const altura = video.videoHeight || 1280;

    const fracoes = duracao > 1.2 ? [0.06, 0.5, 0.88] : [0.02, 0.5, 0.5];
    const quadros: string[] = [];

    for (const fracao of fracoes) {
      await irPara(video, duracao * fracao);
      const quadro = desenharEmJpeg(
        video,
        largura,
        altura,
        LADO_QUADRO,
        QUALIDADE_QUADRO
      );
      if (quadros[quadros.length - 1] !== quadro) quadros.push(quadro);
    }

    if (quadros.length === 0) {
      throw new Error("Não consegui ler as imagens deste vídeo.");
    }

    return {
      duracao,
      largura,
      altura,
      poster: quadros[0],
      quadros: quadros.slice(1)
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function postJson(caminho: string, corpo: unknown, tempoLimite = 60000): Promise<any> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), tempoLimite);
  try {
    const resposta = await fetch(caminho, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: controlador.signal
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new Error(dados?.error || `O servidor respondeu ${resposta.status}.`);
    }
    return dados;
  } finally {
    clearTimeout(relogio);
  }
}

/** Sobe uma foto já comprimida e devolve a URL pública. */
export async function enviarFoto(dataUrl: string, nome?: string): Promise<string> {
  const dados = await postJson("/api/chat/media", { dataUrl, nome }, 120000);
  if (!dados?.url) throw new Error("O servidor não devolveu o endereço da foto.");
  return dados.url as string;
}

/** Pede a URL assinada e envia o vídeo direto para o Storage. */
export async function enviarVideo(arquivo: File): Promise<string> {
  const contentType = arquivo.type || "video/mp4";
  const assinatura = await postJson(
    "/api/chat/media/sign",
    { contentType, tamanho: arquivo.size },
    45000
  );

  if (!assinatura?.uploadUrl || !assinatura?.publicUrl) {
    throw new Error(assinatura?.error || "Não consegui preparar o envio do vídeo.");
  }

  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), 180000);
  let resposta: Response;
  try {
    resposta = await fetch(assinatura.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: arquivo,
      signal: controlador.signal
    });
  } catch {
    throw new Error("O envio do vídeo demorou demais ou a conexão caiu.");
  } finally {
    clearTimeout(relogio);
  }

  if (!resposta.ok) {
    throw new Error(`O envio do vídeo falhou (${resposta.status}).`);
  }

  return assinatura.publicUrl as string;
}

/** Pede ao Barão uma foto e acompanha a revelação até ficar pronta. */
export async function gerarFoto(descricao: string, titulo?: string): Promise<string> {
  const pedido = await postJson(
    "/api/image/generate",
    { description: descricao, title: titulo || "Uma lembrança do Barão" },
    60000
  );

  if (pedido?.isConfigError) {
    throw new Error(pedido?.error || "A geração de imagens não está configurada.");
  }
  if (!pedido?.taskId) {
    throw new Error(pedido?.error || "Não consegui começar a revelar a foto.");
  }

  const limite = Date.now() + 120000;
  while (Date.now() < limite) {
    await new Promise(r => setTimeout(r, 3500));
    const resposta = await fetch(`/api/image/status/${pedido.taskId}`);
    const estado = await resposta.json().catch(() => null);
    if (estado?.state === "success" && estado?.imageUrl) return estado.imageUrl as string;
    if (estado?.state === "fail") {
      throw new Error(estado?.error || "A revelação não deu certo.");
    }
  }

  throw new Error("A revelação demorou mais que o esperado.");
}

/** "1:07" ou "0:09", para o selo de duração. */
export function duracaoCurta(segundos: number): string {
  const total = Math.max(0, Math.round(segundos || 0));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}
