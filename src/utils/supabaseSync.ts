import { User, DiaryEntry, HistoryEntry, Message } from "../types";
import { supabase } from "../lib/supabase";

/**
 * fetch wrapper that attaches the Supabase session JWT.
 * The backend requires it to authorize access to user data.
 */
let lastSessionExpiredWarn = 0;

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(input, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });

  // Sessão vencida/ausente: sem o token válido, NADA sincroniza com o banco
  // (tudo fica preso no navegador). Avisa o app para pedir novo login,
  // no máximo uma vez por minuto para não virar spam.
  if (response.status === 401 && typeof window !== "undefined") {
    console.error(`[BackendSync] Sessão expirada ou ausente ao chamar ${input} — sincronização bloqueada até novo login.`);
    const now = Date.now();
    if (now - lastSessionExpiredWarn > 60_000) {
      lastSessionExpiredWarn = now;
      window.dispatchEvent(new CustomEvent("barao:session-expired"));
    }
  }

  return response;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function isSupabaseSyncReady(): boolean {
  return true;
}

// For backward compatibility
export function isFirebaseSyncReady(): boolean {
  return true;
}

/**
 * Sync user profile with backend 'usuarios' table.
 * Returns the normalized profile from the server (e.g. avatarUrl converted
 * from base64 to a permanent public URL), or null on failure.
 */
export async function syncUserProfile(user: User, localProfileDetails?: any): Promise<any | null> {
  try {
    const profileToSave = {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      preferredSound: user.preferredSound,
      plan: user.plan,
      tokens: user.tokens,
      ...localProfileDetails
    };
    const res = await apiFetch(`/api/profiles/${user.id}`, {
      method: "POST",
      body: JSON.stringify(profileToSave)
    });
    if (!res.ok) {
      console.error("[BackendSync Error] Profile sync rejected:", res.status);
      return null;
    }
    console.log("[BackendSync] User profile synced successfully!");
    const data = await res.json().catch(() => null);
    return data?.profile || null;
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync user profile:", error);
    return null;
  }
}

/**
 * Load the user profile stored in the backend (perfis_editaveis), so the
 * profile — including the photo — follows the user across devices.
 */
export async function fetchUserProfile(userId: string): Promise<any | null> {
  try {
    const res = await apiFetch(`/api/profiles/${userId}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/**
 * Format a "YYYY-MM-DD" key as a readable pt-BR date ("11 de julho de 2026").
 */
function formatDiaryDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

interface CloudDiaryEntry {
  id: number;
  date: string; // "YYYY-MM-DD" (coluna data_resumo)
  title: string | null;
  content: string;
  mood: string | null;
}

/**
 * Sync diary entries with backend 'diario_automatico' table.
 * The DB column data_resumo is a Postgres DATE, so we always send the
 * entry id ("YYYY-MM-DD") — never the formatted display date.
 */
export async function syncDiaryEntries(userId: string, localEntries: DiaryEntry[]): Promise<DiaryEntry[]> {
  try {
    // 1. Get existing diary entries from backend
    const res = await apiFetch(`/api/diaries?uid=${userId}`);
    if (!res.ok) throw new Error("Failed to load diaries");
    const rawCloudList: CloudDiaryEntry[] = await res.json();
    const cloudList = rawCloudList.map(c => ({ ...c, date: String(c.date).slice(0, 10) }));

    // 2. Concilia cada página local com o banco:
    //    - existe no banco → mantém (atualizando lá se o texto mudou);
    //    - não existe mas JÁ FOI sincronizada → apagada em outro aparelho:
    //      descarta a cópia local;
    //    - não existe e nunca foi sincronizada → é nova: envia ao banco.
    const merged: DiaryEntry[] = [];
    for (const local of localEntries) {
      const cloud = cloudList.find(c => c.date === local.id);

      if (!cloud && local.synced) {
        // Apagada em outro aparelho — remove localmente também
        continue;
      }

      if (!cloud || cloud.content !== local.content) {
        const postRes = await apiFetch("/api/diaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userId,
            date: local.id,
            title: local.summary?.join(", ") || "Entrada do Diário",
            content: local.content,
            mood: local.summary?.join(", ") || "Acolhido"
          })
        });
        if (!postRes.ok) {
          console.error(
            `[BackendSync Error] Failed to save diary entry ${local.id}:`,
            postRes.status,
            await postRes.text().catch(() => "")
          );
        }
        merged.push({ ...local, synced: postRes.ok ? true : local.synced });
      } else {
        merged.push({ ...local, synced: true });
      }
    }

    // 3. Adiciona páginas que só existem no banco (outros aparelhos)
    for (const cloud of cloudList) {
      if (!merged.some(l => l.id === cloud.date)) {
        merged.push({
          id: cloud.date,
          date: formatDiaryDate(cloud.date),
          content: cloud.content,
          status: "generated",
          summary: cloud.title ? cloud.title.split(", ") : [],
          intensity: 0,
          createdAt: new Date().toISOString(),
          synced: true
        });
      }
    }
    return merged;
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync diary entries:", error);
    return localEntries;
  }
}

/**
 * Delete a diary entry from the backend by its day key ("YYYY-MM-DD"),
 * so a locally deleted entry does not come back on the next sync.
 */
export async function deleteCloudDiaryEntry(userId: string, dayId: string) {
  try {
    const res = await apiFetch(`/api/diaries?uid=${userId}`);
    if (!res.ok) return;
    const cloudList: CloudDiaryEntry[] = await res.json();
    const target = cloudList.find(c => String(c.date).slice(0, 10) === dayId);
    if (target) {
      await apiFetch(`/api/diaries/${target.id}`, { method: "DELETE" });
    }
  } catch (error) {
    console.error("[BackendSync Error] Failed to delete diary entry:", error);
  }
}

interface CloudHistoryEntry {
  id: number;
  title: string;
  description: string | null;
  story: string | null;
  imageUrl: string | null;
  createdAt?: string;
}

// Chave de comparação por título (o backend faz upsert por usuário+título)
function historyKey(title: string): string {
  return (title || "").trim().toLowerCase().slice(0, 155);
}

/**
 * Sync history entries with backend 'album_emocional' table.
 * Local entries win (they carry type/createdAt); cloud-only entries are
 * mapped back to the HistoryEntry shape. Duplicates (same title) are
 * collapsed so the UI never shows the same memory twice.
 */
export async function syncHistoryEntries(userId: string, localHistories: HistoryEntry[]): Promise<HistoryEntry[]> {
  try {
    // 0. Collapse local duplicates left behind by older sync versions,
    //    keeping the copy that has an image/story when they differ
    const dedupedLocal: HistoryEntry[] = [];
    const seen = new Set<string>();
    for (const local of localHistories) {
      const key = historyKey(local.title);
      if (seen.has(key)) {
        const kept = dedupedLocal.find(l => historyKey(l.title) === key);
        if (kept) {
          if (!kept.imageUrl && local.imageUrl) kept.imageUrl = local.imageUrl;
          if (!kept.story && local.story) kept.story = local.story;
        }
        continue;
      }
      seen.add(key);
      dedupedLocal.push(local);
    }

    // 1. Get existing from backend. Se a listagem falhar, seguimos mesmo
    //    assim: o POST é um upsert por título, então reenviar é seguro e
    //    garante que as lembranças novas cheguem ao banco.
    let cloudList: CloudHistoryEntry[] = [];
    let cloudOk = false;
    try {
      const res = await apiFetch(`/api/albums?uid=${userId}`);
      if (res.ok) {
        cloudList = await res.json();
        cloudOk = true;
      } else {
        console.error("[BackendSync Error] Failed to list albums:", res.status);
      }
    } catch (listErr) {
      console.error("[BackendSync Error] Failed to list albums:", listErr);
    }

    // 2. Concilia cada lembrança local com o banco:
    //    - existe no banco → mantém e marca como sincronizada;
    //    - não existe mas JÁ FOI sincronizada → foi apagada em outro
    //      aparelho: descarta a cópia local (não ressuscita);
    //    - não existe e nunca foi sincronizada → é nova: envia ao banco.
    const reconciled: HistoryEntry[] = [];
    for (const local of dedupedLocal) {
      const cloud = cloudOk ? cloudList.find(c => historyKey(c.title) === historyKey(local.title)) : undefined;

      if (cloud) {
        // O banco é a fonte da verdade para o conteúdo: se a lembrança de
        // mesmo título foi recriada/atualizada em outro aparelho, a versão
        // do banco substitui a cópia local antiga
        reconciled.push({
          ...local,
          title: cloud.title,
          imageUrl: cloud.imageUrl || local.imageUrl,
          description: cloud.description || local.description,
          story: cloud.story || local.story,
          createdAt: cloud.createdAt || local.createdAt,
          synced: true
        });
        continue;
      }

      if (cloudOk && local.synced) {
        // Apagada em outro aparelho — remove localmente também
        continue;
      }

      // Foto base64 muito grande estouraria o limite de 4,5MB por
      // requisição da Vercel — envia a lembrança sem a foto nesse caso
      let imageForCloud: string | null = local.imageUrl || null;
      if (imageForCloud && imageForCloud.startsWith("data:image") && imageForCloud.length > 3_500_000) {
        imageForCloud = null;
      }

      const postRes = await apiFetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userId,
          title: local.title,
          description: local.description,
          story: local.story,
          imageUrl: imageForCloud
        })
      });
      if (!postRes.ok) {
        console.error(
          `[BackendSync Error] Failed to save album entry "${local.title}":`,
          postRes.status,
          await postRes.text().catch(() => "")
        );
      }
      reconciled.push({ ...local, synced: postRes.ok ? true : local.synced });
    }

    // 3. Merge: local entries first, then cloud-only ones (dedup by title).
    //    If the local copy lost its image (ex.: localStorage cheio), adota a
    //    imagem guardada no banco.
    const merged: HistoryEntry[] = [...reconciled];
    const mergedKeys = new Set(merged.map(l => historyKey(l.title)));
    for (const cloud of cloudList) {
      const key = historyKey(cloud.title);
      if (mergedKeys.has(key)) {
        const existing = merged.find(l => historyKey(l.title) === key);
        if (existing) {
          if (!existing.imageUrl && cloud.imageUrl) existing.imageUrl = cloud.imageUrl;
          if (!existing.story && cloud.story) existing.story = cloud.story;
        }
        continue;
      }
      mergedKeys.add(key);
      merged.push({
        id: "cloud-" + cloud.id,
        title: cloud.title,
        imageUrl: cloud.imageUrl || "",
        description: cloud.description || "",
        story: cloud.story || "",
        type: "upload",
        createdAt: cloud.createdAt || new Date().toISOString(),
        synced: true
      });
    }

    // 4. Mais recentes primeiro, em todos os aparelhos
    merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return merged;
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync history entries:", error);
    return localHistories;
  }
}

/**
 * Upload a user photo (base64 data URL) to the backend Storage and return
 * its lightweight public URL, or null on failure.
 */
export async function uploadAlbumPhoto(dataUrl: string): Promise<string | null> {
  try {
    const res = await apiFetch("/api/image/upload", {
      method: "POST",
      body: JSON.stringify({ dataUrl })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.url || null;
  } catch {
    return null;
  }
}

/**
 * Delete an album memory from the backend by its title, removing every
 * duplicated row that shares the same title so it doesn't come back on
 * the next sync.
 */
export async function deleteCloudHistoryEntry(userId: string, title: string) {
  try {
    const res = await apiFetch(`/api/albums?uid=${userId}`);
    if (!res.ok) return;
    const cloudList: CloudHistoryEntry[] = await res.json();
    const targets = cloudList.filter(c => historyKey(c.title) === historyKey(title));
    for (const target of targets) {
      await apiFetch(`/api/albums/${target.id}`, { method: "DELETE" });
    }
  } catch (error) {
    console.error("[BackendSync Error] Failed to delete album entry:", error);
  }
}

/**
 * Sync conversations with backend 'conversas' and 'mensagens' tables
 */
export async function syncConversations(userId: string, threadId: string, messages: Message[]) {
  try {
    // 1. Get user's chats
    const chatsRes = await apiFetch(`/api/chats?uid=${userId}`);
    if (!chatsRes.ok) throw new Error("Failed to load conversations");
    const chatsList = await chatsRes.json();

    // 2. Find or create conversation for this threadId / user
    let activeChat = chatsList.find((c: any) => c.status === "ativa");
    if (!activeChat) {
      const createRes = await apiFetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userId,
          title: "Abrigo dos Desabafos"
        })
      });
      if (createRes.ok) {
        activeChat = await createRes.json();
      }
    }

    if (!activeChat) return;

    // 3. Load messages for this activeChat
    const msgsRes = await apiFetch(`/api/chats/${activeChat.id}/messages`);
    if (!msgsRes.ok) return;
    const cloudMsgs: any[] = await msgsRes.json();

    // 4. Save any message that does not exist in backend
    for (const local of messages) {
      if (local.id === "welcome") continue;
      const exists = cloudMsgs.some(m => m.text === local.text);
      if (!exists) {
        await apiFetch(`/api/chats/${activeChat.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: local.role === "user" ? "user" : "model",
            text: local.text,
            audioUrl: local.audioUrl || ""
          })
        });
      }
    }
    console.log("[BackendSync] Conversations sintonizadas com sucesso!");
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync conversations:", error);
  }
}
