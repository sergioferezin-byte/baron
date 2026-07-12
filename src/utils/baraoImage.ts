/**
 * Imagem realista do Barão (kie.ai).
 *
 * Pede ao servidor a geração de uma imagem fotográfica a partir do título e
 * da descrição de uma lembrança, e acompanha a tarefa até ficar pronta.
 * Quando a cena pede, o servidor usa fotos de referência (retrato do Barão
 * e/ou a foto de perfil da usuária, enviada em userPhoto) para manter os
 * rostos fiéis. Devolve a URL da imagem, ou null quando indisponível.
 */
export async function requestBaraoImageUrl(
  title: string,
  description: string,
  userPhoto?: string,
  attachedPhoto?: string,
  uid?: string
): Promise<string | null> {
  try {
    const createRes = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        userPhoto: userPhoto || null,
        // Foto anexada à lembrança: sempre usada como base/referência da cena
        attachedPhoto: attachedPhoto || null,
        // uid permite ao servidor buscar a foto de perfil no banco de dados
        uid: uid || null
      })
    });
    const created = await createRes.json().catch(() => null);

    if (!createRes.ok) {
      // Créditos do kie.ai esgotados: avisa com clareza em vez de falhar em silêncio
      const detail = String(created?.detail || "");
      if (detail.includes("Credits insufficient") || detail.includes("\"code\":402")) {
        throw new Error("Os créditos da conta kie.ai se esgotaram. Recarregue o saldo em kie.ai para que o Barão volte a pintar imagens e falar com voz realista.");
      }
      return null;
    }

    if (!created?.taskId) return null;

    // Z-Image costuma ficar pronto em poucos segundos; espera até ~60s
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const statusRes = await fetch(`/api/image/status/${created.taskId}`);
      if (!statusRes.ok) return null;

      const status = await statusRes.json();
      if (status.state === "success" && status.imageUrl) return status.imageUrl;
      if (status.state === "fail") return null;
    }
    return null;
  } catch (err) {
    // Erros com mensagem clara para a usuária (ex.: créditos esgotados) sobem para a tela
    if (err instanceof Error && err.message.includes("kie.ai")) throw err;
    return null;
  }
}
