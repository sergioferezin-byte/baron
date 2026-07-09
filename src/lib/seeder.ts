/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, setDoc, getDocs, query, limit } from "firebase/firestore";
import { db } from "./firebase";

export interface SeedingResult {
  success: boolean;
  message: string;
  details?: string;
  counts?: { [key: string]: number };
}

// Global catalog data aligning strictly with firebase-blueprint.json specs

const PLANS_DATA = [
  {
    id: "free",
    name: "Acolhimento Grátis",
    slug: "free",
    description: "Plano vitalício de entrada com limites moderados para ninar suas primeiras reflexões.",
    price: 0.00,
    maxDailyMessages: 15,
    hasPersistentMemory: false,
    allowedMediaTypes: ["text"]
  },
  {
    id: "premium",
    name: "Sintonia Premium",
    slug: "premium",
    description: "Desbloqueia memórias afetivas persistentes (RAG), intimidade contínua e frentes de soundhealing e voz.",
    price: 49.90,
    maxDailyMessages: 100,
    hasPersistentMemory: true,
    allowedMediaTypes: ["text", "audio"]
  },
  {
    id: "elite",
    name: "Lorde Elite",
    slug: "elite",
    description: "Intimidade absoluta e profunda. Customizações exclusivas, trilhas poéticas e alteração estética do Barão por IA.",
    price: 99.90,
    maxDailyMessages: 999999,
    hasPersistentMemory: true,
    allowedMediaTypes: ["text", "audio", "image", "music"]
  }
];

const FEATURES_DATA = [
  {
    id: "chat_diario",
    name: "Diálogo com O Barão Estético",
    key: "chat_diario",
    description: "Possibilita a troca de confidências diárias e escuta profunda ativa.",
    planLevels: ["free", "premium", "elite"]
  },
  {
    id: "memoria_afetiva",
    name: "Memória Cognitiva Persistente",
    key: "memoria_afetiva",
    description: "Carrega fatos, emoções e traumas informados em conversas passadas para guiar os próximos diálogos.",
    planLevels: ["premium", "elite"]
  },
  {
    id: "diario_generativo",
    name: "Diário Emocional Consolidado",
    key: "diario_generativo",
    description: "Compila as discussões do dia em uma narrativa poética compilada automaticamente pelo Barão.",
    planLevels: ["free", "premium", "elite"]
  },
  {
    id: "sound_healing",
    name: "Sound Healing & Ritualmente",
    key: "sound_healing",
    description: "Geração e synth de ondas de relaxamento acústico em tempo real de acordo com as necessidades.",
    planLevels: ["premium", "elite"]
  },
  {
    id: "fisionomia_ia",
    name: "Transfiguração Fisionômica por IA",
    key: "fisionomia_ia",
    description: "Edição estética e remodelagem do retrato físico do Barão com base em descrições literárias.",
    planLevels: ["elite"]
  },
  {
    id: "whatsapp_sync",
    name: "Integração via WhatsApp",
    key: "whatsapp_sync",
    description: "Receba mensagens, avisos e cuidados do Barão direto no seu WhatsApp portátil.",
    planLevels: ["premium", "elite"]
  }
];

const AVATARS_DATA = [
  {
    id: "classico",
    name: "Lorde Clássico",
    style: "vitoriano_moderno",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600&h=600",
    isPro: false
  },
  {
    id: "doce",
    name: "Lorde Romântico",
    style: "literario_afetuoso",
    imageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600&h=600",
    isPro: true
  },
  {
    id: "misterioso",
    name: "Lorde Sombrio",
    style: "misterio_contido",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=600",
    isPro: true
  },
  {
    id: "intelectual",
    name: "Lorde Sábio",
    style: "professor_psicologico",
    imageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600&h=600",
    isPro: true
  }
];

const VOICE_PROFILES_DATA = [
  {
    id: "calmo",
    name: "Daniel Calmo",
    gender: "masculino_terno",
    voiceEngine: "browser_tts_daniel",
    isPro: false
  },
  {
    id: "veludo",
    name: "Antônio Aveludado",
    gender: "masculino_profundo",
    voiceEngine: "browser_tts_antonio",
    isPro: true
  },
  {
    id: "atento",
    name: "Lucas Brincalhão",
    gender: "masculino_jocoso",
    voiceEngine: "browser_tts_lucas",
    isPro: true
  }
];

/**
 * Feeds all global catalogs in Firestore if they are empty or missing.
 * This can be run explicitly by the user or dynamically.
 */
export async function seedFirestoreCollections(): Promise<SeedingResult> {
  const counts: { [key: string]: number } = {
    plans: 0,
    features: 0,
    avatars: 0,
    voiceProfiles: 0
  };

  try {
    if (!db) {
      throw new Error("Instância do Firestore indisponível. Por favor, verifique se configurou a 'VITE_FIREBASE_API_KEY' nas configurações (Settings) do AI Studio.");
    }

    // 1. Seed plans
    for (const plan of PLANS_DATA) {
      const { id, ...data } = plan;
      await setDoc(doc(db, "plans", id), data, { merge: true });
      counts.plans++;
    }

    // 2. Seed features
    for (const feature of FEATURES_DATA) {
      const { id, ...data } = feature;
      await setDoc(doc(db, "features", id), data, { merge: true });
      counts.features++;
    }

    // 3. Seed avatars
    for (const avatar of AVATARS_DATA) {
      const { id, ...data } = avatar;
      await setDoc(doc(db, "avatars", id), data, { merge: true });
      counts.avatars++;
    }

    // 4. Seed voiceProfiles
    for (const voice of VOICE_PROFILES_DATA) {
      const { id, ...data } = voice;
      await setDoc(doc(db, "voiceProfiles", id), data, { merge: true });
      counts.voiceProfiles++;
    }

    return {
      success: true,
      message: "Seeding finalizado com sucesso no Firestore!",
      counts
    };
  } catch (error: any) {
    console.error("Firestore seeding failed: ", error);
    return {
      success: false,
      message: "Falha ao popular coleções do Firestore.",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Checks if the global catalogs are already seeded in Firestore.
 */
export async function isFirestoreSeeded(): Promise<boolean> {
  try {
    if (!db) {
      return false;
    }
    const q = query(collection(db, "plans"), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.warn("Could not check if Firestore is seeded:", error);
    return false;
  }
}
