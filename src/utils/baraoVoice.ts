/**
 * Voz do Barão.
 *
 * Pede ao servidor o áudio de um texto e devolve a URL, ou null quando a
 * ElevenLabs não respondeu. A voz é sempre a do Barão na ElevenLabs
 * (ELEVENLABS_VOICE_ID no servidor): não há voz de reserva. Quando vier null,
 * quem chamou mostra o aviso BARAO_VOICE_UNAVAILABLE em vez de tocar outra voz.
 *
 * As rotas /api/voice/azure, /api/voice/fallback e /api/voice/speak seguem no
 * servidor, mas não são mais usadas aqui.
 */
export const BARAO_VOICE_UNAVAILABLE = "A voz do Barão está indisponível agora. Tente de novo em instantes.";

export async function requestBaraoVoiceUrl(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/voice/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.audioUrl || null;
  } catch {
    return null;
  }
}
