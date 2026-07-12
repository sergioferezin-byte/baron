/**
 * Voz realista do Barão (kie.ai + ElevenLabs).
 *
 * Pede ao servidor a geração do áudio para um texto e acompanha a tarefa
 * até ficar pronta. Devolve a URL do áudio, ou null quando indisponível
 * (chave ausente, falha ou tempo esgotado) — nesse caso quem chamou deve
 * recorrer à voz do navegador (speechSynthesis) como reserva.
 */
export async function requestBaraoVoiceUrl(text: string): Promise<string | null> {
  try {
    const createRes = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!createRes.ok) return null;

    const created = await createRes.json();
    if (!created?.taskId) return null;

    // A voz costuma ficar pronta em poucos segundos; espera até ~45s
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const statusRes = await fetch(`/api/voice/status/${created.taskId}`);
      if (!statusRes.ok) return null;

      const status = await statusRes.json();
      if (status.state === "success" && status.audioUrl) return status.audioUrl;
      if (status.state === "fail") return null;
    }
    return null;
  } catch {
    return null;
  }
}
