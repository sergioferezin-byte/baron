import { User, DiaryEntry, HistoryEntry, Message } from "../types";
import { supabase } from "../lib/supabase";

/**
 * fetch wrapper that attaches the Supabase session JWT.
 * The backend requires it to authorize access to user data.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(input, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
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
 * Sync user profile with backend 'usuarios' table
 */
export async function syncUserProfile(user: User, localProfileDetails?: any) {
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
    await apiFetch(`/api/profiles/${user.id}`, {
      method: "POST",
      body: JSON.stringify(profileToSave)
    });
    console.log("[BackendSync] User profile synced successfully!");
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync user profile:", error);
  }
}

/**
 * Sync diary entries with backend 'diario_automatico' table
 */
export async function syncDiaryEntries(userId: string, localEntries: DiaryEntry[]): Promise<DiaryEntry[]> {
  try {
    // 1. Get existing diary entries from backend
    const res = await apiFetch(`/api/diaries?uid=${userId}`);
    if (!res.ok) throw new Error("Failed to load diaries");
    const cloudList: DiaryEntry[] = await res.json();

    // 2. Find any local entries that do not exist in cloud and post them to backend
    for (const local of localEntries) {
      const exists = cloudList.some(c => c.date === local.date);
      if (!exists) {
        await apiFetch("/api/diaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userId,
            date: local.date,
            title: local.summary?.join(", ") || "Entrada do Diário",
            content: local.content,
            mood: local.summary?.join(", ") || "Acolhido"
          })
        });
      }
    }

    // 3. Fetch final updated list from backend
    const finalRes = await apiFetch(`/api/diaries?uid=${userId}`);
    if (finalRes.ok) {
      return await finalRes.json();
    }
    return cloudList;
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync diary entries:", error);
    return localEntries;
  }
}

/**
 * Sync history entries with backend 'album_emocional' table
 */
export async function syncHistoryEntries(userId: string, localHistories: HistoryEntry[]): Promise<HistoryEntry[]> {
  try {
    // 1. Get existing from backend
    const res = await apiFetch(`/api/albums?uid=${userId}`);
    if (!res.ok) throw new Error("Failed to load album history");
    const cloudList: HistoryEntry[] = await res.json();

    // 2. Upload any local histories that don't exist in the database
    for (const local of localHistories) {
      const exists = cloudList.some(c => c.title === local.title);
      if (!exists) {
        await apiFetch("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userId,
            title: local.title,
            description: local.description,
            story: local.story,
            imageUrl: local.imageUrl
          })
        });
      }
    }

    // 3. Get final list
    const finalRes = await apiFetch(`/api/albums?uid=${userId}`);
    if (finalRes.ok) {
      return await finalRes.json();
    }
    return cloudList;
  } catch (error) {
    console.error("[BackendSync Error] Failed to sync history entries:", error);
    return localHistories;
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
