/**
 * Imagem poética do Barão (kie.ai + Z-Image).
 *
 * Pede ao servidor a geração de uma imagem artística a partir do título e da
 * descrição de uma lembrança, e acompanha a tarefa até ficar pronta.
 * Devolve a URL da imagem, ou null quando indisponível (chave ausente,
 * falha ou tempo esgotado).
 */
export async function requestBaraoImageUrl(title: string, description: string): Promise<string | null> {
  try {
    const createRes = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description })
    });
    if (!createRes.ok) return null;

    const created = await createRes.json();
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
  } catch {
    return null;
  }
}
