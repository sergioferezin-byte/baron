/**
 * Voz realista do Barão.
 *
 * Pede ao servidor o áudio de um texto e devolve a URL, ou null quando
 * nenhum serviço está disponível — nesse caso quem chamou deve recorrer à
 * voz do navegador (speechSynthesis) como último recurso.
 *
 * A ordem é:
 *   1. ElevenLabs — voz escolhida pela Nice, síncrona (poucos segundos)
 *   2. Azure AI Speech — reserva rápida, voz masculina brasileira
 *   3. Gemini TTS — última reserva do servidor
 *   4. (quem chama) voz do navegador
 *
 * A ponte antiga do kie.ai/ElevenLabs está fora do ar desde jul/2026; por
 * isso falamos direto com a API da ElevenLabs. Os endpoints /api/voice/speak
 * e /status seguem no servidor apenas para retestar o fornecedor.
 */
async function requestVoiceUrl(endpoint: string, text: string): Promise<string | null> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    // isConfigError: serviço sem chave — segue para o próximo da fila
    return data?.audioUrl || null;
  } catch {
    return null;
  }
}

export async function requestBaraoVoiceUrl(text: string): Promise<string | null> {
  const eleven = await requestVoiceUrl("/api/voice/elevenlabs", text);
  if (eleven) return eleven;

  const azure = await requestVoiceUrl("/api/voice/azure", text);
  if (azure) return azure;

  console.warn("[BaraoVoice] Voz principal indisponível — usando a reserva.");
  return requestVoiceUrl("/api/voice/fallback", text);
}
