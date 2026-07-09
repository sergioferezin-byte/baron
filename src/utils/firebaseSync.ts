/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  collectionGroup,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { User, DiaryEntry, HistoryEntry, Message } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles Firestore errors by packaging detailed diagnostic info into a JSON block.
 * Conforms to the strict instructions in firebase-integration SKILL.md.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error Handled]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Checks if Firestore and Authentication are fully connected and online.
 */
export function isFirebaseSyncReady(): boolean {
  return !!db && !!auth && !!auth.currentUser;
}

/**
 * Automatically pushes the user's core profile and preferences to Firestore
 * to synchronize with the security rules model.
 */
export async function syncUserProfile(user: User, fullProfileData?: any) {
  if (!isFirebaseSyncReady()) return;

  const userId = auth.currentUser!.uid;
  const pathUser = `users/${userId}`;
  const pathPrefs = `userPreferences/${userId}`;

  try {
    // 1. Write core user document
    const userDocData = {
      email: user.email,
      nome_completo: user.name,
      apelido: user.nickname || user.name.split(" ")[0],
      role: 'user',
      createdAt: new Date(user.createdAt || Date.now()).toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", userId), userDocData);

    // 2. Write preferences document. fullProfileData (the entire "Meu Universo" profile
    // object) is persisted verbatim so Firestore is the single source of truth for it.
    // The fixed fields below are applied AFTER the spread so they always satisfy the
    // security rules, regardless of what fullProfileData contains. avatar_model_style
    // stays a short fixed placeholder (rules cap it at 50 chars) — the real avatar/photo
    // (which can be a large base64 data URI) lives in the unrestricted `avatarUrl` field.
    const prefData = {
      ...(fullProfileData || {}),
      idioma_preferido: "pt-BR",
      timezone: "America/Sao_Paulo",
      preferred_voice_id: user.preferredSound || fullProfileData?.preferredSound || "chuva",
      avatar_model_style: "custom",
      genero_afetor: "feminino",
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "userPreferences", userId), prefData);

    console.log("[FirebaseSync] Core user profiles sintonizados com sucesso!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathUser);
  }
}

/**
 * Reads the user's full profile (core user doc + preferences/"Meu Universo" doc) back
 * from Firestore. Returns null if neither document exists yet.
 */
export async function getUserProfile(userId: string): Promise<Record<string, any> | null> {
  if (!db) return null;
  const path = `userPreferences/${userId}`;
  try {
    const [userSnap, prefsSnap] = await Promise.all([
      getDoc(doc(db, "users", userId)),
      getDoc(doc(db, "userPreferences", userId))
    ]);

    if (!userSnap.exists() && !prefsSnap.exists()) return null;

    const prefsData = prefsSnap.exists() ? prefsSnap.data() : {};
    const userData = userSnap.exists() ? userSnap.data() : {};

    return {
      ...prefsData,
      name: prefsData.name || userData.nome_completo,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Reads all diary entries for a user directly from Firestore (no local merge).
 */
export async function getDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  if (!db) return [];
  const path = `users/${userId}/diaryEntries`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "diaryEntries"));
    const entries: DiaryEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        date: data.date,
        content: data.content,
        status: data.status || "generated",
        intensity: data.intensity || 3,
        createdAt: data.createdAt || new Date().toISOString(),
        summary: data.summary || []
      });
    });
    return entries.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Syncs the local diary entries with the cloud Firestore collection of diaryEntries.
 * Pulls any cloud entries and merges them into localStorage, while pushing new ones.
 */
export async function syncDiaryEntries(userId: string, localEntries: DiaryEntry[]): Promise<DiaryEntry[]> {
  if (!isFirebaseSyncReady()) return localEntries;

  const path = `users/${userId}/diaryEntries`;
  try {
    // 1. Fetch existing entries from cloud
    const snapshot = await getDocs(collection(db, "users", userId, "diaryEntries"));
    const cloudEntriesMap = new Map<string, any>();
    snapshot.forEach(doc => {
      cloudEntriesMap.set(doc.id, doc.data());
    });

    const mergedEntries: DiaryEntry[] = [...localEntries];

    // 2. Scan and merge from cloud to local
    cloudEntriesMap.forEach((cloudData, entryId) => {
      const existingIdx = mergedEntries.findIndex(e => e.id === entryId);
      const mappedEntry: DiaryEntry = {
        id: entryId,
        date: cloudData.date,
        content: cloudData.content,
        status: cloudData.status || "generated",
        intensity: cloudData.intensity || 3,
        createdAt: cloudData.createdAt || new Date().toISOString(),
        summary: cloudData.summary || []
      };

      if (existingIdx === -1) {
        mergedEntries.push(mappedEntry);
      } else {
        // If local is unmodified or older, default to cloud version
        const local = mergedEntries[existingIdx];
        if (new Date(cloudData.createdAt || 0) > new Date(local.createdAt || 0)) {
          mergedEntries[existingIdx] = mappedEntry;
        }
      }
    });

    // 3. Push local entries that don't exist under cloud or are newer
    const batch = writeBatch(db);
    let count = 0;

    for (const entry of mergedEntries) {
      const cloudEntry = cloudEntriesMap.get(entry.id);
      
      if (!cloudEntry || new Date(entry.createdAt) > new Date(cloudEntry.createdAt || 0)) {
        const docRef = doc(db, "users", userId, "diaryEntries", entry.id);
        batch.set(docRef, {
          date: entry.id.substring(0, 10), // safe "YYYY-MM-DD"
          title: "Entrada do Diário",
          content: entry.content || "",
          humorConsolidado: entry.summary?.join(", ") || "neutro",
          status: entry.status || "generated",
          intensity: entry.intensity || 3,
          createdAt: entry.createdAt || new Date().toISOString()
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`[FirebaseSync] enviou ${count} diários para a nuvem.`);
    }

    return mergedEntries.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return localEntries;
  }
}

/**
 * Reads all history/memory entries for a user directly from Firestore (no local merge).
 */
export async function getHistoryEntries(userId: string): Promise<HistoryEntry[]> {
  if (!db) return [];
  const path = `users/${userId}/lifeEvents`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "lifeEvents"));
    const entries: HistoryEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        title: data.title || "Crônica",
        description: data.description || "",
        story: data.story || "",
        imageUrl: data.imageUrl || "",
        type: data.type || "generated",
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Syncs memory and life history entries into Firestore as lifeEvents.
 */
export async function syncHistoryEntries(userId: string, localHistories: HistoryEntry[]): Promise<HistoryEntry[]> {
  if (!isFirebaseSyncReady()) return localHistories;

  const path = `users/${userId}/lifeEvents`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "lifeEvents"));
    const cloudDocsMap = new Map<string, any>();
    snapshot.forEach(doc => {
      cloudDocsMap.set(doc.id, doc.data());
    });

    const mergedHistory = [...localHistories];

    // Merge cloud entries down to local
    cloudDocsMap.forEach((cloudData, eventId) => {
      const idx = mergedHistory.findIndex(h => h.id === eventId);
      const mapped: HistoryEntry = {
        id: eventId,
        title: cloudData.title || "Crônica",
        description: cloudData.description || "",
        story: cloudData.story || "",
        imageUrl: cloudData.imageUrl || "",
        type: cloudData.type || "generated",
        createdAt: cloudData.createdAt || new Date().toISOString()
      };

      if (idx === -1) {
        mergedHistory.push(mapped);
      } else {
        const local = mergedHistory[idx];
        if (new Date(cloudData.createdAt || 0) > new Date(local.createdAt || 0)) {
          mergedHistory[idx] = mapped;
        }
      }
    });

    // Upload local-only or newer entries
    const batch = writeBatch(db);
    let count = 0;

    for (const h of mergedHistory) {
      const cloudData = cloudDocsMap.get(h.id);
      if (!cloudData || new Date(h.createdAt) > new Date(cloudData.createdAt || 0)) {
        const docRef = doc(db, "users", userId, "lifeEvents", h.id);
        batch.set(docRef, {
          title: h.title,
          description: h.description,
          eventDate: h.createdAt.substring(0, 10),
          story: h.story,
          imageUrl: h.imageUrl,
          type: h.type,
          isResolved: true,
          createdAt: h.createdAt || new Date().toISOString()
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`[FirebaseSync] enviou ${count} crônicas para a nuvem.`);
    }

    return mergedHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return localHistories;
  }
}

/**
 * Reads every message from a single conversation thread, ordered chronologically.
 */
export async function getConversationMessages(threadId: string): Promise<Message[]> {
  if (!db) return [];
  const path = `conversations/${threadId}/messages`;
  try {
    const snapshot = await getDocs(collection(db, "conversations", threadId, "messages"));
    const rows: { id: string; data: any }[] = [];
    snapshot.forEach(docSnap => rows.push({ id: docSnap.id, data: docSnap.data() }));
    rows.sort((a, b) => String(a.data.createdAt || "").localeCompare(String(b.data.createdAt || "")));

    return rows.map(({ id, data }) => ({
      id: id === "welcome_msg" ? "welcome" : id,
      role: data.role === "usuario" ? "user" : "model",
      text: data.content || "",
      timestamp: data.createdAt
        ? new Date(data.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "",
      date: data.createdAt ? String(data.createdAt).substring(0, 10) : undefined
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Reads every message the user has ever sent/received, across all conversation threads,
 * ordered chronologically. Used by the Diary feature to cluster dialogue by day.
 * Requires a Firestore composite index on the "messages" collection group:
 * (userId ASC, createdAt ASC).
 */
export async function getAllUserMessagesByDate(userId: string): Promise<Message[]> {
  if (!db) return [];
  const path = `collectionGroup(messages) where userId == ${userId}`;
  try {
    const q = query(
      collectionGroup(db, "messages"),
      where("userId", "==", userId),
      orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    const messages: Message[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        role: data.role === "usuario" ? "user" : "model",
        text: data.content || "",
        timestamp: data.createdAt
          ? new Date(data.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "",
        date: data.createdAt ? String(data.createdAt).substring(0, 10) : undefined
      });
    });
    return messages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Pushes general conversation details and individual messages to Firestore.
 */
export async function syncConversations(userId: string, threadId: string, messages: Message[]) {
  if (!isFirebaseSyncReady()) return;

  const convPath = `conversations/${threadId}`;
  try {
    // 1. Create or touch the root active Conversation document in Firestore
    const convRef = doc(db, "conversations", threadId);
    const convSnap = await getDoc(convRef);
    
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        userId: userId,
        personaId: "barao-estetico",
        titulo: "Abrigo dos Desabafos de " + (auth.currentUser?.displayName || "Visitante"),
        status: "ativa",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Sync message items inside nested collection
    const batch = writeBatch(db);
    let messageCount = 0;

    for (const msg of messages) {
      const msgId = msg.id && msg.id !== "welcome" ? msg.id : "welcome_msg";
      const cleanedId = msgId.replace(/[^a-zA-Z0-9_\-]/g, "_"); // sanitize ID for rules validation
      const msgRef = doc(db, "conversations", threadId, "messages", cleanedId);

      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) {
        batch.set(msgRef, {
          userId: userId,
          role: msg.role === "user" ? "usuario" : "barao",
          content: msg.text || "",
          contentType: "text",
          createdAt: new Date().toISOString()
        });
        messageCount++;
      }
    }

    if (messageCount > 0) {
      await batch.commit();
      console.log(`[FirebaseSync] Enviou ${messageCount} mensagens de diálogo.`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, convPath);
  }
}
