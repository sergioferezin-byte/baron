/**
 * Voz realista do Barão (kie.ai + ElevenLabs).
 *
 * Pede ao servidor a geração do áudio para um texto e acompanha a tarefa
 * até ficar pronta. Devolve a URL do áudio, ou null quando indisponível
 * (chave ausente, falha ou tempo esgotado) — nesse caso quem chamou deve
 * recorrer à voz do navegador (speechSynthesis) como reserva.
 */
// Disjuntor: quando o serviço de voz do kie.ai está fora do ar, todas as
// tentativas ficam presas por ~45s antes de cair na voz do navegador. Após
// duas falhas seguidas, pulamos a chamada por alguns minutos — a usuária
// ouve a voz do navegador imediatamente, sem espera.
const OUTAGE_COOLDOWN_MS = 5 * 60 * 1000;
let consecutiveFailures = 0;
let outageUntil = 0;

function noteFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= 2) {
    outageUntil = Date.now() + OUTAGE_COOLDOWN_MS;
    console.warn("[BaraoVoice] Serviço de voz indisponível — usando a voz do navegador por alguns minutos.");
  }
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

    // A voz costuma ficar pronta em poucos segundos; espera até ~45s
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

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
