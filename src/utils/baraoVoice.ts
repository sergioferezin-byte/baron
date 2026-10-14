/**
 * Voz realista do Barão.
 *
 * Pede ao servidor o áudio de um texto e devolve a URL, ou null quando
 * nenhum serviço está disponível — nesse caso quem chamou deve recorrer à
 * voz do navegador (speechSynthesis) como último recurso.
 *
 * A ordem é:
 *   1. Azure AI Speech — voz masculina brasileira, síncrona (menos de 1s)
 *   2. Gemini TTS — reserva; mesma função, entonação menos estável
 *   3. (quem chama) voz do navegador
 *
 * O kie.ai/ElevenLabs saiu dessa cadeia: sua ponte de TTS está fora do ar
 * desde jul/2026 e cada tentativa custava até 24s de espera antes de
 * falhar. Os endpoints /api/voice/speak e /status seguem no servidor para
 * retestar o fornecedor — se ele voltar, basta voltar a chamá-los aqui.
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
  const azure = await requestVoiceUrl("/api/voice/azure", text);
  if (azure) return azure;

  console.warn("[BaraoVoice] Voz principal indisponível — usando a reserva.");
  return requestVoiceUrl("/api/voice/fallback", text);
}
