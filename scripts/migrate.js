/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Meu Barão - Firestore Database Migration & Seeding CLI script
 * 
 * This script seeds the global catalogs for plans, features, avatars, and voice profiles
 * in Firestore. To run this script:
 * 
 * 1. Download your Service Account credentials json file from Firebase Console:
 *    https://console.firebase.google.com/project/meubarao-b049c/settings/serviceaccounts/adminsdk
 * 2. Save it as 'service-account.json' next to this script.
 * 3. Install firebase-admin globally or locally:
 *    npm install firebase-admin
 * 4. Run the script:
 *    node scripts/migrate.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

console.log("=================================================");
console.log("  MEU BARÃO - FIRESTORE INITIALIZATION & SEEDING ");
console.log("=================================================");

// Locate service account credentials file
const serviceAccountPath = path.join(__dirname, "service-account.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("\x1b[31m[ERROR] Arquivo de credenciais 'service-account.json' não encontrado!\x1b[0m");
  console.log("Por favor, faça download da chave de serviço do seu projeto 'meubarao-b049c' em:");
  console.log("👉 https://console.firebase.google.com/project/meubarao-b049c/settings/serviceaccounts/adminsdk?hl=pt-br");
  console.log("Salve o arquivo baixado como 'scripts/service-account.json' e tente novamente.\n");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// Catalog definitions matching firebase-blueprint.json specifications

const PLANS = [
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

const FEATURES = [
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

const AVATARS = [
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

const VOICE_PROFILES = [
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

async function seedCollection(collectionName, items) {
  console.log(`Seeding collection '${collectionName}'...`);
  let seededCount = 0;
  
  for (const item of items) {
    const docId = item.id;
    const itemCopy = { ...item };
    delete itemCopy.id; // Store without redundant ID property if desired
    
    await db.collection(collectionName).doc(docId).set(itemCopy, { merge: true });
    seededCount++;
    console.log(`  └ Documento '${docId}' [OK]`);
  }
  
  console.log(`\x1b[32m[SUCCESS] Coleção '${collectionName}' populada com ${seededCount} registros.\x1b[0m\n`);
}

async function runMigration() {
  try {
    // 1. Seed global plans
    await seedCollection("plans", PLANS);
    
    // 2. Seed global features
    await seedCollection("features", FEATURES);
    
    // 3. Seed global system avatars
    await seedCollection("avatars", AVATARS);
    
    // 4. Seed voice profiles
    await seedCollection("voiceProfiles", VOICE_PROFILES);

    console.log("=================================================");
    console.log("\x1b[32m✔ TODAS AS MIGRAÇÕES FOREM CONCLUÍDAS COM SUCESSO!\x1b[0m");
    console.log("Sua instância de base no Firebase está refinada sob a");
    console.log("arquitetura canônica de domínios Meu Barão.");
    console.log("=================================================");
  } catch (error) {
    console.error("\x1b[31mMigração interrompida devido a erro:\x1b[0m", error);
  } finally {
    process.exit(0);
  }
}

// Fire!
runMigration();
