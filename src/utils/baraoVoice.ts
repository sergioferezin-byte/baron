/**
 * Voz realista do Barão (kie.ai + ElevenLabs).
 *
 * Pede ao servidor a geração do áudio para um texto e acompanha a tarefa
 * até ficar pronta. Devolve a URL do áudio, ou null quando indisponível
 * (chave ausente, falha ou tempo esgotado) — nesse caso quem chamou deve
 * recorrer à voz do navegador (speechSynthesis) como reserva.
 */
// Disjuntor: quando o serviço de voz do kie.ai falha, cada tentativa
// gastaria ~30s e dezenas de requisições de acompanhamento, travando o
// app. Na primeira falha já passamos a usar a voz do navegador na hora;
// falhas seguidas prolongam a pausa. Um sucesso reabilita tudo.
const FIRST_COOLDOWN_MS = 3 * 60 * 1000;
const LONG_COOLDOWN_MS = 15 * 60 * 1000;
let consecutiveFailures = 0;
let outageUntil = 0;

function noteFailure() {
  consecutiveFailures++;
  outageUntil = Date.now() + (consecutiveFailures >= 3 ? LONG_COOLDOWN_MS : FIRST_COOLDOWN_MS);
  console.warn("[BaraoVoice] Serviço de voz indisponível — usando a voz do navegador por alguns minutos.");
}

export async function requestBaraoVoiceUrl(text: string): Promise<string | null> {
  // Serviço reconhecidamente fora do ar: nem tenta, responde na hora
  if (Date.now() < outageUntil) return null;

  try {
    const createRes = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!createRes.ok) {
      noteFailure();
      return null;
    }

    const created = await createRes.json();
    if (!created?.taskId) {
      noteFailure();
      return null;
    }

    // A voz pronta leva poucos segundos; consulta a cada 2s por até ~30s
    // (antes eram 30 consultas em 45s, o que congestionava o navegador)
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusRes = await fetch(`/api/voice/status/${created.taskId}`);
      if (!statusRes.ok) continue;

      const status = await statusRes.json();
      if (status.state === "success" && status.audioUrl) {
        consecutiveFailures = 0;
        outageUntil = 0;
        return status.audioUrl;
      }
      if (status.state === "fail") {
        noteFailure();
        return null;
      }
    }

    // Tempo esgotado sem resposta: trata como indisponibilidade
    noteFailure();
    return null;
  } catch {
    noteFailure();
    return null;
  }
}
