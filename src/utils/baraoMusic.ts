/**
 * Canção do Barão (kie.ai + Suno).
 *
 * Envia a composição (título, estilo e letra) ao servidor, que aciona o
 * Suno, e acompanha a gravação até ficar pronta. Devolve as faixas com
 * URLs permanentes (guardadas no Storage), ou null quando indisponível.
 */
export interface BaraoTrack {
  audioUrl: string;
  imageUrl: string | null;
  duration: number | null;
  title: string | null;
}

export async function requestBaraoSong(
  title: string,
  style: string,
  lyrics: string,
  onProgress?: (message: string) => void
): Promise<{ tracks: BaraoTrack[] } | { error: string }> {
  try {
    const createRes = await fetch("/api/music/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, style, lyrics })
    });
    const created = await createRes.json().catch(() => null);

    if (!createRes.ok || !created?.taskId) {
      const detail = String(created?.detail || "");
      if (detail.includes("Credits insufficient") || detail.includes("\"code\":402")) {
        return { error: "Os créditos da conta kie.ai se esgotaram. Recarregue o saldo para o Barão gravar sua canção." };
      }
      if (created?.isConfigError) {
        return { error: created.error || "Estúdio musical não configurado." };
      }
      return { error: "Não consegui acender o estúdio agora. Tente novamente em instantes." };
    }

    // O Suno costuma levar de 40s a 3min; acompanha por até ~5 minutos
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusRes = await fetch(`/api/music/status/${created.taskId}`);
      if (!statusRes.ok) continue;

      const status = await statusRes.json();
      if (status.state === "success" && status.tracks?.length > 0) {
        return { tracks: status.tracks };
      }
      if (status.state === "fail") {
        return { error: status.error || "A gravação da canção falhou." };
      }
      if (onProgress && attempt % 5 === 0) {
        onProgress("O Barão está gravando sua canção no estúdio...");
      }
    }
    return { error: "A gravação demorou mais que o esperado. Tente novamente em alguns minutos." };
  } catch {
    return { error: "Nossa ponte com o estúdio oscilou. Tente novamente." };
  }
}
