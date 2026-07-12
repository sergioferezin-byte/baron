/**
 * Comprime uma imagem no navegador (via canvas) antes do envio ao servidor.
 *
 * Fotos de celular chegam a 2–4MB e, convertidas em base64, passam de 5MB —
 * acima do limite de 4,5MB por requisição da Vercel e perto do teto do
 * localStorage. Redimensionar para no máximo `maxDim` pixels e reencodar em
 * JPEG derruba o tamanho para ~200–400KB sem perda visível.
 *
 * Devolve a imagem como data URL (base64). Em caso de falha na compressão,
 * devolve o arquivo original sem comprimir.
 */
export function compressImageFile(
  file: File,
  maxDim: number = 1600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = () => {
      const originalDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));

          // Já é pequena (dimensão e peso)? Mantém a original
          if (scale >= 1 && originalDataUrl.length < 700_000) {
            resolve(originalDataUrl);
            return;
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(originalDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(originalDataUrl);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
