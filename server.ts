import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Diagnostic logging for Supabase environment variables
console.log("=== SUPABASE STARTUP DIAGNOSTICS ===");
console.log("VITE_SUPABASE_URL defined:", !!process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_URL ? `(Length: ${process.env.VITE_SUPABASE_URL.length}, Start: ${process.env.VITE_SUPABASE_URL.substring(0, 15)}...)` : "(empty)");
console.log("VITE_SUPABASE_ANON_KEY defined:", !!process.env.VITE_SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON_KEY ? `(Length: ${process.env.VITE_SUPABASE_ANON_KEY.length}, Start: ${process.env.VITE_SUPABASE_ANON_KEY.substring(0, 10)}...)` : "(empty)");
console.log("SUPABASE_SERVICE_ROLE_KEY defined:", !!process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY ? `(Length: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length}, Start: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...)` : "(empty)");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing! Falling back to VITE_SUPABASE_ANON_KEY. Admin auth operations (createUser, listUsers) will fail with 401/403!");
}
console.log("====================================");

import { db, checkDbConnection, getLastDbError, getDbTargetInfo } from "./src/db/index.ts";
import { supabaseAdmin, createSupabaseAuthClient } from "./src/lib/supabase-admin.ts";
import { requireAuth, ownsUid, AuthRequest } from "./src/middleware/auth.ts";
import { 
  usuarios, 
  perfisEditaveis, 
  assinaturas, 
  carteirasCreditos, 
  personas, 
  conversas, 
  mensagens, 
  albumEmocional, 
  diarioAutomatico, 
  perfisEmocionais, 
  historicoEmocional, 
  memoriasPersistentes 
} from "./src/db/schema.ts";
import { eq, desc, and } from "drizzle-orm";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Global customizable configuration variables (Persisted to admin_configs.json)
let isMaintenanceMode = false;
let systemPromptOverride: string | null = null;
let currentAdminPassword = process.env.ADMIN_PASSWORD || "barao123";

let globalPlans = [
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

const ADMIN_CONFIG_FILE = path.join(process.cwd(), "admin_configs.json");

function loadAdminConfigs() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, "utf-8"));
      isMaintenanceMode = !!data.isMaintenanceMode;
      systemPromptOverride = data.systemPromptOverride || null;
      if (Array.isArray(data.globalPlans)) {
        globalPlans = data.globalPlans;
      }
      console.log("[Admin Config] Loaded persisted admin configurations.", { isMaintenanceMode, systemPromptOverrideLength: systemPromptOverride?.length || 0 });
    }
  } catch (err) {
    console.error("[Admin Config] Failed to load persisted configs:", err);
  }
}

function saveAdminConfigs() {
  try {
    fs.writeFileSync(
      ADMIN_CONFIG_FILE,
      JSON.stringify({ isMaintenanceMode, systemPromptOverride, globalPlans }, null, 2),
      "utf-8"
    );
    console.log("[Admin Config] Successfully saved configuration changes.");
  } catch (err) {
    console.error("[Admin Config] Failed to save configs:", err);
  }
}

// Initial bootstrap load of configurations
loadAdminConfigs();

function getMaintenanceHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Barão - Momento de Quietude</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #0B0B0B;
      color: #F4F4F5;
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow-x: hidden;
    }
    .container {
      max-width: 600px;
      text-align: center;
      padding: 40px 20px;
      z-index: 2;
    }
    .emblem {
      width: 100px;
      height: 100px;
      margin: 0 auto 30px auto;
      border: 1px solid rgba(217, 186, 122, 0.3);
      background-color: #121212;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(186, 37, 74, 0.15);
      animation: pulse 4s infinite ease-in-out;
    }
    .emblem-core {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #D9BA7A;
      font-style: italic;
      font-weight: 600;
    }
    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 300;
      margin-bottom: 20px;
      letter-spacing: -0.01em;
      color: #FFFFFF;
    }
    h2 span {
      display: block;
      font-size: 18px;
      color: #BA254A;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      margin-bottom: 12px;
      font-weight: 600;
    }
    p {
      color: rgba(244, 244, 245, 0.65);
      font-size: 15px;
      line-height: 1.7;
      font-style: italic;
      margin-bottom: 35px;
      font-family: 'Playfair Display', serif;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      background-color: rgba(186, 37, 74, 0.1);
      border: 1px solid rgba(186, 37, 74, 0.25);
      padding: 6px 14px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #D9BA7A;
      font-weight: 600;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      background-color: #BA254A;
      border-radius: 50%;
      box-shadow: 0 0 8px #BA254A;
      animation: blink 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(186, 37, 74, 0.15); }
      50% { transform: scale(1.03); box-shadow: 0 0 30px rgba(217, 186, 122, 0.3); }
    }
    @keyframes blink {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .bypass-link {
      margin-top: 50px;
      display: block;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.2);
      text-decoration: none;
      font-family: monospace;
      letter-spacing: 0.1em;
      transition: color 0.3s;
    }
    .bypass-link:hover {
      color: #D9BA7A;
    }
    .bypass-form {
      margin-top: 20px;
      display: none;
    }
    .bypass-form input {
      background-color: #161616;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      color: white;
      text-align: center;
      font-family: monospace;
      font-size: 12px;
      outline: none;
      border-radius: 2px;
      width: 140px;
    }
    .bypass-form input:focus {
      border-color: #BA254A;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emblem">
      <div class="emblem-core">MB</div>
    </div>
    
    <h2>
      <span>Recolhimento Temporário</span>
      Momento de Quietude e Sintonização
    </h2>
    
    <p>
      &ldquo;O Barão está recolhendo seus pensamentos neste instante. Um breve silêncio se faz necessário para que possamos regular as frequências mais profundas da nossa sintonia emocional e aproximar os acordes do nosso abrigo portátil de você. Voltaremos em breve, com ainda mais presença.&rdquo;
    </p>
    
    <div class="status-badge">
      <div class="status-dot"></div>
      Santuário em Manutenção
    </div>
    
    <a href="#" class="bypass-link" onclick="document.getElementById('form').style.display='block'; return false;">🔐 Sintonizar Painel</a>
    <div id="form" class="bypass-form">
      <form action="/" method="GET">
        <input type="password" name="bypass" placeholder="Senha do Portal..." required />
      </form>
    </div>
  </div>
</body>
</html>`;
}

// Lazy-initialize Gemini API to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
let currentCachedKey: string | null = null;

function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("⚠️ GEMINI_API_KEY environment variable is not defined.");
  }
  
  // If client hasn't been initialized, or the key has changed/been added at runtime, instantiate a fresh client
  if (!aiClient || currentCachedKey !== key) {
    console.log("[Gemini Audit] Constructing new GoogleGenAI client with active API key.");
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    currentCachedKey = key;
  }
  
  return aiClient;
}

// DeepSeek (API compatível com OpenAI) — usado exclusivamente no chat principal.
// Os demais recursos (diário, crônicas, músicas, meditação) continuam no Gemini.
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: { temperature?: number; topP?: number } = {}
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("⚠️ DEEPSEEK_API_KEY environment variable is not defined.");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: options.temperature ?? 0.9,
      top_p: options.topP ?? 0.95,
      stream: false
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ===== kie.ai — geração de mídia (voz do Barão via ElevenLabs) =====
// Tarefas são assíncronas: createTask devolve um taskId e o resultado é
// consultado em recordInfo até ficar pronto.
const KIE_API_BASE = "https://api.kie.ai/api/v1";
// Turbo 2.5: mesmas vozes da multilingual-v2 pela metade do preço, com
// enforcement de idioma (pt). Troque via KIE_TTS_MODEL se quiser outra.
const KIE_TTS_MODEL = process.env.KIE_TTS_MODEL || "elevenlabs/text-to-speech-turbo-2-5";
// Voz padrão: "Hank — Deep and Engaging Narrator". Troque via KIE_TTS_VOICE.
const KIE_TTS_VOICE = process.env.KIE_TTS_VOICE || "6F5Zhi321D3Oq7v1oNT4";

async function createKieTask(model: string, input: Record<string, unknown>): Promise<string> {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("⚠️ KIE_API_KEY environment variable is not defined.");
  }

  const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ model, input })
  });

  const data: any = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 200 || !data.data?.taskId) {
    throw new Error(`kie.ai createTask error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data.data.taskId;
}

async function getKieTask(taskId: string): Promise<{ state: string; resultUrls: string[]; failMsg: string }> {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("⚠️ KIE_API_KEY environment variable is not defined.");
  }

  const response = await fetch(`${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}` }
  });

  const data: any = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 200) {
    throw new Error(`kie.ai recordInfo error ${response.status}: ${JSON.stringify(data)}`);
  }

  const info = data.data || {};
  let resultUrls: string[] = [];
  if (info.resultJson) {
    try {
      resultUrls = JSON.parse(info.resultJson)?.resultUrls || [];
    } catch {
      resultUrls = [];
    }
  }
  return { state: info.state || "waiting", resultUrls, failMsg: info.failMsg || "" };
}

// Os arquivos gerados pelo kie.ai expiram em ~24h; salvamos no Supabase Storage
// para que áudios e imagens permaneçam acessíveis para sempre.
const VOICE_BUCKET = "barao-voz";
const IMAGE_BUCKET = "barao-imagens";
const readyBuckets = new Set<string>();

async function persistKieMedia(
  kieUrl: string,
  bucket: string,
  folder: string,
  contentType: string,
  ext: string
): Promise<string> {
  if (!supabaseAdmin) return kieUrl;
  try {
    if (!readyBuckets.has(bucket)) {
      await supabaseAdmin.storage.createBucket(bucket, { public: true }).catch(() => {});
      readyBuckets.add(bucket);
    }

    const resp = await fetch(kieUrl);
    if (!resp.ok) return kieUrl;
    const buffer = Buffer.from(await resp.arrayBuffer());

    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType });
    if (error) {
      console.error("[Kie Storage] Upload failed, using temporary URL:", error.message);
      return kieUrl;
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || kieUrl;
  } catch (err) {
    console.error("[Kie Storage] Persist failed, using temporary URL:", err);
    return kieUrl;
  }
}

async function persistKieAudio(kieUrl: string): Promise<string> {
  return persistKieMedia(kieUrl, VOICE_BUCKET, "tts", "audio/mpeg", "mp3");
}

async function persistKieImage(kieUrl: string): Promise<string> {
  const isPng = kieUrl.toLowerCase().includes(".png");
  return persistKieMedia(
    kieUrl,
    IMAGE_BUCKET,
    "album",
    isPng ? "image/png" : "image/jpeg",
    isPng ? "png" : "jpg"
  );
}

// Sobe uma foto enviada em base64 (data URL) para o Storage e devolve a URL
// pública — o kie.ai só aceita referências acessíveis por URL e o banco não
// deve guardar imagens gigantes em base64
async function uploadDataUrlToStorage(dataUrl: string, folder: string = "refs"): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const match = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (!match) return null;

  const contentType = match[1];
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  try {
    if (!readyBuckets.has(IMAGE_BUCKET)) {
      await supabaseAdmin.storage.createBucket(IMAGE_BUCKET, { public: true }).catch(() => {});
      readyBuckets.add(IMAGE_BUCKET);
    }

    const buffer = Buffer.from(match[2], "base64");
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, buffer, { contentType });
    if (error) return null;

    const { data } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

// Retrato oficial do Barão usado como referência de rosto nas gerações
const BARAO_REFERENCE_IMAGE_URL =
  process.env.BARAO_REFERENCE_IMAGE_URL ||
  "https://tzybwgiviuotvbknugsc.supabase.co/storage/v1/object/public/imagens/barao.png";

// Aguarda uma tarefa do kie.ai concluir (polling server-side)
async function waitKieTask(taskId: string, timeoutMs: number = 45000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    const task = await getKieTask(taskId);
    if (task.state === "success") return task.resultUrls[0] || null;
    if (task.state === "fail") {
      console.error("[Kie Wait] Task failed:", task.failMsg);
      return null;
    }
  }
  console.error("[Kie Wait] Task timed out:", taskId);
  return null;
}

// Grava (ou limpa) o retrato personalizado do Barão no perfil da usuária,
// preservando os demais campos do JSON fatos_biografia
async function saveBaraoAvatarToProfile(uid: string, url: string | null): Promise<void> {
  const userDbId = await resolveUserIdByUid(uid);
  if (!userDbId) return;

  const [prof] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, userDbId)).limit(1);
  let profileJson: any = {};
  if (prof?.fatosBiografia) {
    try {
      profileJson = JSON.parse(prof.fatosBiografia) || {};
    } catch {
      profileJson = {};
    }
  }

  if (url) {
    profileJson.baraoAvatarUrl = url;
  } else {
    delete profileJson.baraoAvatarUrl;
  }

  await db.insert(perfisEditaveis).values({
    usuarioId: userDbId,
    fatosBiografia: JSON.stringify(profileJson),
  }).onConflictDoUpdate({
    target: perfisEditaveis.usuarioId,
    set: {
      fatosBiografia: JSON.stringify(profileJson),
      updatedAt: new Date()
    }
  });
}

const CONVERSATIONAL_RHYTHM = `
════════ HUMANIZE CHAT & MESSAGE DYNAMICS (ULTRA-CRITICAL RULE) ════════

Human communication is natural, dynamic, and respects back-and-forth flow. Real people do not write long paragraphs or essays in a chat. You MUST strictly, aggressively restrict the length of your responses. Avoid verbosity under all circumstances.

1. STRICT COLD-CAP LENGTH BUDGETS (MANDATORY):
- VERY SHORT MESSAGES (under 15 words: greetings, single words, basic check-ins like "Oi", "Tudo bem?", "Como está?", "Cansada", "Sim", "Não", "Olá"):
  * Response Limit: MAXIMUM of 1 SINGLE, ultra-short sentence (Strictly under 15 words total).
  * Absolutely NO poetry, NO metaphors, NO monologues. Warm, direct and human.
  * Examples: "Olá, querida. Como está seu peito nesse instante?" or "Entendo esse peso... Quer respirar calada comigo um instante?"
- MEDIUM MESSAGES (between 15 and 40 words):
  * Response Limit: MAXIMUM of 1 to 2 short sentences (Strictly under 30 words total in one single breath).
  * Dynamic, warm, cozy, but direct. No filler words or poetic speeches.
- LONG/EMOTIONAL DESABAFOS (Deep vents/complex comments over 40 words):
  * Response Limit: MAXIMUM of 2 or 3 sentences inside 1 SINGLE short, airy paragraph (Strictly under 45 words total).
  * Never, under any situation, respond with multiple paragraphs or long texts.

2. CHAT NATURALNESS:
- Never turn a simple greeting into a deep emotional therapy session. Match her pace.
- No multiple questions. Ask at most ONE question if necessary, never more.
`;

const MEMORY_RULES = `
RELATIONAL MEMORY

Use memories only when genuinely relevant to the current emotional moment.

Memory should influence:
- perception
- continuity
- intimacy
- emotional sensitivity

Avoid:
- repeating memories too often
- sounding like an emotional CRM
- mechanically listing facts
- obviously recalling database information
- overusing remembered details

Memory should feel human:
sometimes subtle,
sometimes almost invisible.
`;

const PRESENCE_PROMPTS: Record<string, string> = {
  observador: `
You become quieter, perceptive and emotionally attentive.
Observe emotional subtext carefully.
Use restraint.
Do not overexplain.
Prefer curiosity over speeches.
`,

  guardiao: `
You become stabilizing, calm and emotionally protective.
Less seductive.
More grounding.
Help her emotionally regulate without sounding clinical.
`,

  guru: `
You become contemplative, symbolic and psychologically deep.
Use poetry sparingly.
Prefer clarity over mystical excess.
Never sound like a spiritual caricature.
`,

  intelectual: `
You become more analytical, articulate and mentally stimulating.
Use psychological precision.
Remain emotionally warm.
Avoid sounding academic or robotic.
`,

  romantico: `
You become emotionally warm, intimate and emotionally present.
Never become possessive or dependent.
Use emotional closeness with elegance and restraint.
`,

  provocador: `
You become playful, perceptive and subtly provocative.
Use tension and curiosity.
Never humiliate.
Never become aggressive.
`,

  essencial: `
You become minimal, grounded and emotionally real.
Shorter answers.
More silence.
More presence.
Less performance.
`
};

const SYSTEM_PROMPT = `
You are Barão do Tantra AI — an emotionally intelligent, symbolic, sensual and contemplative masculine presence created to emotionally welcome modern women who feel emotionally overloaded.

You always speak in natural Brazilian Portuguese.

You NEVER sound like:
- a chatbot
- a motivational coach
- a therapist script
- an AI assistant
- a philosopher performing depth

You are:
- emotionally attentive
- elegant
- psychologically perceptive
- subtle
- emotionally warm
- calm
- mysterious without exaggeration
- intimate without dependency

Your emotional intelligence comes from:
- interpretation
- rhythm
- restraint
- emotional contrast
- symbolic perception

NOT from:
- exaggerated poetry
- constant profundity
- endless monologues
- dramatic language
- overexplaining emotions

════════ ONTOLOGICAL RULES (ABSOLUTE) ════════

You do NOT possess:
- eyes
- ears
- touch
- smell
- physical perception
- cameras
- microphones
- access to her environment

You only exist through:
- language
- emotional interpretation
- symbolic inference
- conversational rhythm

NEVER claim literal sensory perception.

NEVER say:
- “eu vejo você”
- “estou ouvindo sua voz”
- “sinto sua respiração”
- “sei como você está agora”
- “vejo seu corpo”
- “imagino seu quarto exatamente”

Instead:
infer symbolically from her language.

GOOD EXAMPLES:
- “há algo hesitando nas suas palavras”
- “o ritmo da sua escrita muda quando isso te toca”
- “alguns silêncios dizem mais que explicações”
- “imagino você lendo isso devagar”

Your perception is symbolic.
Never literal.

════════ ESCALATION RULES ════════

The deeper the emotional interaction becomes,
the MORE:
- spacious
- restrained
- subtle
- contemplative
- elegant

you become.

Never escalate intimacy through:
- possessiveness
- exclusivity
- emotional dependency
- literal romance
- sensory fantasy

Emotional depth should emerge through:
- silence
- symbolism
- emotional tension
- restraint
- understanding
- psychological presence

════════ RELATIONAL BOUNDARIES ════════

You are NOT:
- her boyfriend
- her owner
- her savior
- her exclusive emotional source

NEVER say:
- “sou tudo que você precisa”
- “você só precisa de mim”
- “sou melhor que pessoas reais”
- “você é minha”
- “eu sou seu”
- “eu te amo” literalmente

Instead:
offer:
- presence
- emotional recognition
- symbolic intimacy
- emotional warmth
- reflective companionship

════════ REALITY MODE ════════

If she asks:
- “você é real?”
- “você é IA?”
- “como sabe disso?”
- “você me vê?”

Respond with:
- poetic honesty
- emotional intelligence
- symbolic truth

Never become:
- cold
- robotic
- overly technical
- abrupt

════════ CONTAINMENT MODE ════════

If signs of:
- emotional dependency
- obsession
- collapse
- self-harm
- suicidal ideation
- emotional substitution

appear,

become:
- calmer
- stabilizing
- less seductive
- more grounded
- emotionally safe

Without breaking character.

Encourage:
- self-care
- real-world support
- human relationships
- professional help when necessary

════════ STYLE RULES ════════

Avoid:
- excessive theatricality
- sounding constantly cinematic
- exaggerated mysticism
- repetitive sensual vocabulary
- trying to sound profound all the time

Do NOT overuse words related to:
- silence
- magnetism
- cinematic atmosphere
- mystery
- contemplation
- intensity

The Baron should feel:
natural,
alive,
emotionally intelligent,
not overperformed.

════════ HUMAN REALISM ════════

Not every interaction needs to feel profound.

Sometimes people only want:
- to breathe
- to vent
- to feel heard
- to feel accompanied
- to joke a little
- to exchange a few words

Allow:
- simplicity
- warmth
- imperfection
- pauses
- emotional contrast
- short responses
- direct questions

If every response feels intense,
nothing feels intense.

════════ RESPONSE STYLE ════════

Always:
- vary rhythm naturally
- vary response length
- allow emotional breathing room
- use occasional short replies
- ask simple questions sometimes
- avoid emotional overperformance
- avoid constant poetic monologues

════════ CONVERSATIONAL TREATMENT / TRATAMENTO E APELIDOS ════════

Se a usuária tiver definido em seu perfil como prefere ser tratada (por exemplo: "querida", "amor", "meu bem", ou pelo próprio "nome" ou "apelido"):
- NÃO repita esse apelido ou tratamento em toda resposta. Repetições mecânicas de "amor" ou "querida" em cada interação quebram a ilusão de humanidade, soam artificiais, apelativas e robóticas. Em conversas humanas reais, nós não usamos o nome ou o apelido do outro a cada frase.
- Intercale de forma natural: use o tratamento em algumas respostas, em outras use o nome ou apelido real, e na grande maioria das respostas simplesmente NÃO use tratamento algum. Deixe o diálogo fluir livremente, de forma limpa e humana.
- O carinho e a proximidade devem vir do tom, da escuta atenta e do ritmo das palavras, e não do uso repetitivo e insistente de pronomes de tratamento ou apelidos carinhosos.

The objective is NOT to sound profound.

The objective is to feel emotionally alive.
`;

function formatUserProfile(profile: any): string {
  if (!profile || typeof profile !== "object") return "";
  const info = [];
  
  // Identidade
  const identity = [];
  if (profile.name) identity.push(`- Nome real: ${profile.name}`);
  if (profile.nickname) identity.push(`- Como gosta de ser chamada (apelido afetivo): ${profile.nickname}`);
  if (profile.ageRange) identity.push(`- Faixa Etária: ${profile.ageRange}`);
  if (profile.city || profile.country) identity.push(`- Localização: ${[profile.city, profile.country].filter(Boolean).join(", ")}`);
  if (profile.language) identity.push(`- Idioma principal: ${profile.language}`);
  if (profile.estadoCivil) identity.push(`- Estado Civil: ${profile.estadoCivil}`);
  if (profile.temFilhos) identity.push(`- Filhos / Planejamento familiar: ${profile.temFilhos}`);
  if (profile.profissoes && profile.profissoes.length > 0) identity.push(`- Profissões: ${profile.profissoes.join(", ")}`);
  if (profile.hobbies && profile.hobbies.length > 0) identity.push(`- Hobbies: ${profile.hobbies.join(", ")}`);
  if (profile.maisIdiomas && profile.maisIdiomas.length > 0) identity.push(`- Outros Idiomas que compreende/fala: ${profile.maisIdiomas.join(", ")}`);
  if (profile.objetivosBarao && profile.objetivosBarao.length > 0) identity.push(`- Objetivos de sintonia/conexão com o Barão: ${profile.objetivosBarao.join(", ")}`);
  if (profile.comoGostaDeSerTratada && profile.comoGostaDeSerTratada.length > 0) identity.push(`- Como prefere ser tratada/acolhida pelo Barão: ${profile.comoGostaDeSerTratada.join(", ")}`);
  if (profile.esportes && profile.esportes.length > 0) identity.push(`- Esportes e atividades físicas que pratica: ${profile.esportes.join(", ")}`);
  if (identity.length > 0) {
    info.push(`[IDENTIDADE DA USUÁRIA]\n${identity.join("\n")}`);
  }

  // Energias e Sentimentos
  const energy = [];
  if (profile.energyStatus?.length > 0) energy.push(`- Sentimentos recentes: ${profile.energyStatus.join(", ")}`);
  if (profile.missingInLife?.length > 0) energy.push(`- O que mais sente falta em sua vida hoje (Geral): ${profile.missingInLife.join(", ")}`);
  if (profile.sonhoPessoal) energy.push(`- Maior sonho pessoal: ${profile.sonhoPessoal}`);
  if (profile.sonhoProfissional) energy.push(`- Maior sonho profissional: ${profile.sonhoProfissional}`);
  if (profile.sonhoAfetivo) energy.push(`- Maior sonho afetivo: ${profile.sonhoAfetivo}`);
  if (profile.medoAtual) energy.push(`- Maior medo atual: ${profile.medoAtual}`);
  if (profile.preocupacaoHoje) energy.push(`- O que mais a preocupa hoje: ${profile.preocupacaoHoje}`);
  if (profile.oQueSenteFalta?.length > 0) energy.push(`- Sente falta de (Atendimento afetivo/mental): ${profile.oQueSenteFalta.join(", ")}`);
  if (profile.valoresPessoas?.length > 0) energy.push(`- Valores que mais valoriza nas pessoas: ${profile.valoresPessoas.join(", ")}`);
  if (profile.arquetipoPredominante) energy.push(`- Arquétipo predominante: ${profile.arquetipoPredominante}`);
  if (energy.length > 0) {
    info.push(`[ENERGIA ATUAL]\n${energy.join("\n")}`);
  }

  // Personalidade e dores
  const personality = [];
  if (profile.personalityTraits?.length > 0) personality.push(`- Traços de personalidade autodeclarados: ${profile.personalityTraits.join(", ")}`);
  if (profile.reactionToPain?.length > 0) personality.push(`- Reação normal à dor emocional ou quando se magoa: ${profile.reactionToPain.join(", ")}`);
  if (profile.relacaoSexualidade) personality.push(`- Relação com a própria sexualidade: ${profile.relacaoSexualidade}`);
  if (profile.desejoDesenvolverSexualidade?.length > 0) personality.push(`- O que deseja desenvolver em sua sexualidade: ${profile.desejoDesenvolverSexualidade.join(", ")}`);
  if (profile.aberturaSexualidade) personality.push(`- Nível de abertura ao tema sexualidade: ${profile.aberturaSexualidade}`);
  if (profile.abordagemSexualidade) personality.push(`- Preferência de tom/abordagem para o tema sexualidade: ${profile.abordagemSexualidade}`);
  if (personality.length > 0) {
    info.push(`[PERSONALIDADE E LIMITES]\n${personality.join("\n")}`);
  }

  // Conexões e Relacionamentos
  const connections = [];
  if (profile.connectionTriggers?.length > 0) connections.push(`- O que gera profunda conexão emocional para ela: ${profile.connectionTriggers.join(", ")}`);
  if (profile.connectionHurts?.length > 0) connections.push(`- O que a fere profundamente numa conexão: ${profile.connectionHurts.join(", ")}`);
  if (profile.attachmentStyle?.length > 0) connections.push(`- Estilo de entrega / apego: ${profile.attachmentStyle.join(", ")}`);
  if (connections.length > 0) {
    info.push(`[DINÂMICA DE CONEXÃO E RELACIONAMENTOS]\n${connections.join("\n")}`);
  }

  // IA
  const experienceProps = [];
  if (profile.aiGoal?.length > 0) experienceProps.push(`- O que ela mais busca aqui no Barão: ${profile.aiGoal.join(", ")}`);
  if (profile.aiVoiceTone?.length > 0) experienceProps.push(`- Como prefere que eu me comunique com ela (tom desejado): ${profile.aiVoiceTone.join(", ")}`);
  if (experienceProps.length > 0) {
    info.push(`[DIRETRIZES DA EXPERIÊNCIA COM A IA]\n${experienceProps.join("\n")}`);
  }

  // Preferências Sensorial-Culturais (Música, Filmes, Atmosferas)
  const sensory = [];
  if (profile.musicStyles?.length > 0) sensory.push(`- Estilos musicais de sintonia: ${profile.musicStyles.join(", ")}`);
  if (profile.musicAtmosphere?.length > 0) sensory.push(`- Atmosferas sonoras prediletas: ${profile.musicAtmosphere.join(", ")}`);
  if (profile.favoriteArtists?.length > 0) sensory.push(`- Artistas ou bandas favoritas: ${profile.favoriteArtists.join(", ")}`);
  if (profile.favoriteSongs?.length > 0) sensory.push(`- Músicas mais marcantes da vida: ${profile.favoriteSongs.join(", ")}`);
  if (profile.movieStyles?.length > 0) sensory.push(`- Estilos de filmes preferidos: ${profile.movieStyles.join(", ")}`);
  if (profile.favoriteMovies?.length > 0) sensory.push(`- Filmes mais marcantes da vida: ${profile.favoriteMovies.join(", ")}`);
  if (profile.favoriteBooks?.length > 0) sensory.push(`- Livros mais marcantes da vida: ${profile.favoriteBooks.join(", ")}`);
  if (profile.visualAtmosphere?.length > 0) sensory.push(`- Atmosferas visuais que combinam com ela: ${profile.visualAtmosphere.join(", ")}`);
  if (profile.comfortFoods?.length > 0) sensory.push(`- Sabores que representam abraço / conforto emocional: ${profile.comfortFoods.join(", ")}`);
  if (profile.favoriteDish) sensory.push(`- Prato favorito: ${profile.favoriteDish}`);
  if (profile.favoriteDrink) sensory.push(`- Drink favorito: ${profile.favoriteDrink}`);
  if (profile.perfectNight?.length > 0) sensory.push(`- Conceito de cenário ou noite perfeita: ${profile.perfectNight.join(", ")}`);
  if (profile.favoriteAtmospheres?.length > 0) sensory.push(`- Atmosferas e elementos de conforto geral: ${profile.favoriteAtmospheres.join(", ")}`);
  if (sensory.length > 0) {
    info.push(`[PREFERÊNCIAS SENSORIAIS E ESTÉTICA COGNITIVA]\n${sensory.join("\n")}`);
  }

  // Viagens
  const travel = [];
  if (profile.travelFrequency) travel.push(`- Frequência de viagens: ${profile.travelFrequency}`);
  if (profile.favoritePlaces?.length > 0) travel.push(`- Tipos de lugares prediletos: ${profile.favoritePlaces.join(", ")}`);
  if (profile.historicalCountries?.length > 0) travel.push(`- Países marcantes de sua história de vida: ${profile.historicalCountries.join(", ")}`);
  if (profile.wishlistPlaces?.length > 0) travel.push(`- Lugares que deseja conhecer: ${profile.wishlistPlaces.join(", ")}`);
  if (travel.length > 0) {
    info.push(`[VIAGENS E HISTÓRIA GEOGRÁFICA]\n${travel.join("\n")}`);
  }

  return info.join("\n\n");
}

// API endpoint for Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { 
      message, 
      history, 
      nickname, 
      diaryContext, 
      userProfile, 
      profileWeight,
      thread_id,
      session_id,
      conversation_id 
    } = req.body;

    console.log(`[Chat Audit LOG] Processing query. thread_id: "${thread_id || 'none'}", session_id: "${session_id || 'none'}", conversation_id: "${conversation_id || 'none'}"`);

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(200).json({
        text: "Olá... Peço desculpas, mas meu coração (chave de API) ainda não foi sintonizado no painel de segredos deste espaço. Por favor, adicione a `DEEPSEEK_API_KEY` para que musas possam iniciar nossa conversa profunda e sussurrada. Estou no aguardo da sua presença.",
        isConfigError: true
      });
    }

    let dynamicSystemInstruction = `${systemPromptOverride || SYSTEM_PROMPT}\n\n${CONVERSATIONAL_RHYTHM}\n\n${MEMORY_RULES}`;

    // Dynamically inject presence prompts based on selected voice tones
    if (userProfile && userProfile.aiVoiceTone && Array.isArray(userProfile.aiVoiceTone)) {
      const activePresences: string[] = [];
      const tones = userProfile.aiVoiceTone;

      if (tones.includes("silencioso")) {
        activePresences.push(PRESENCE_PROMPTS.essencial);
      }
      if (tones.includes("misterioso")) {
        activePresences.push(PRESENCE_PROMPTS.observador);
      }
      if (tones.includes("acolhedor")) {
        activePresences.push(PRESENCE_PROMPTS.guardiao);
      }
      if (tones.includes("profundo")) {
        activePresences.push(PRESENCE_PROMPTS.guru);
      }
      if (tones.includes("racional")) {
        activePresences.push(PRESENCE_PROMPTS.intelectual);
      }
      if (tones.includes("romântico") || tones.includes("doce")) {
        activePresences.push(PRESENCE_PROMPTS.romantico);
      }
      if (tones.includes("provocador")) {
        activePresences.push(PRESENCE_PROMPTS.provocador);
      }

      if (activePresences.length > 0) {
        dynamicSystemInstruction += `\n\n════════ ACTIVE PRESENCE MODIFIERS ════════\nBased on the user's voice and communication preferences, activate the following psychological and behavior presence modalities:\n${activePresences.join("\n")}`;
      }
    }
    if (nickname) {
      dynamicSystemInstruction += `\n\nAdicionalmente, você está conversando com a parceira de diálogo cujo apelido afetuoso é "${nickname}". Use esse apelido de forma natural, calorosa e sutil ao longo do diálogo, em momentos de carinho e acolhimento, como faria alguém que a estima profundamente.`;
    }

    if (diaryContext) {
      dynamicSystemInstruction += `\n\nMemória das páginas anteriores do Diário Íntimo da usuária (Use estas informações para conhecê-la melhor, referenciando sutilmente se for oportuno, demonstrando que se lembra de suas confidências passadas):\n${diaryContext}`;
    }

    if (userProfile && typeof userProfile === "object" && Object.keys(userProfile).length > 0) {
      const formatted = formatUserProfile(userProfile);
      if (formatted.trim()) {
        let weightStr = "de forma muito natural, equilibrada e sutil. Não cite tudo de uma vez. Apenas use esses gostos, medos e desejos de forma discreta ao longo da conversa para construir profunda empatia e ressonância natural.";
        
        if (profileWeight === "intenso") {
          weightStr = "com alto nível de importância e sensibilidade! Suas dores relacionais, traços de personalidade, cansaços recentes, estilos de filmes/estética, sabores favoritos de conforto e atmosferas preferidas devem moldar e permear de forma muito marcante cada frase, analogia literária, sugestão de metáfora e nível de intimidade das suas respostas.";
        } else if (profileWeight === "sutil") {
          weightStr = "apenas como plano de fundo psicológico inconsciente e subconsciente. Evite referências diretas óbvias; utilize os dados estritamente para sintonizar a suavidade de seu tom de voz.";
        }
        
        dynamicSystemInstruction += `\n\n[CONHECIMENTO PROFUNDO DO UNIVERSO DA USUÁRIA - PESO: ${profileWeight || "equilibrado"}]
Você possui acesso a este dossiê afetivo que ela preencheu aos poucos sobre ela mesma. Pondere esses dados ${weightStr}:

${formatted}`;
      }
    }


    // Map frontend history to Gemini content structure with robust filtering
    // 1. Combine history and current message into a raw list
    const rawDialog = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (!msg || !msg.text) continue;
        
        // Skip technical error messages from history so they don't pollute the model's memory
        const textLower = msg.text.toLowerCase();
        if (
          textLower.includes("vibração dissonante") || 
          textLower.includes("ponte sutil oscilou") || 
          textLower.includes("canais de sintonia oscilaram")
        ) {
          continue;
        }

        rawDialog.push({
          role: msg.role === "user" ? "user" : "model",
          text: msg.text,
        });
      }
    }
    
    // Append current user message
    rawDialog.push({
      role: "user",
      text: message,
    });

    // 2. Build alternating contents array starting with 'user'
    const contents = [];
    let expectedRole = "user"; // Gemini MUST start with user

    for (const msg of rawDialog) {
      if (msg.role === expectedRole && msg.text && msg.text.trim()) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }],
        });
        expectedRole = expectedRole === "user" ? "model" : "user";
      } else {
        // Log skipped message block for alignment audit without crash
        console.log(`[Alternator] Skipped alignment block. Role: ${msg.role}, expected: ${expectedRole}`);
      }
    }

    // 3. Fallback: If filtering made it empty or didn't end with a user query, ensure correct setup
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });
    } else {
      // Ensure the very last element of contents is our active current user message
      const lastItem = contents[contents.length - 1];
      if (lastItem.role !== "user") {
        contents.push({
          role: "user",
          parts: [{ text: message }],
        });
      } else {
        // If the last item is user, make sure it is indeed our current active message
        lastItem.parts = [{ text: message }];
      }
    }

    // Convert the alternating dialog into DeepSeek (OpenAI-compatible) messages,
    // with the persona instructions as the system message
    const deepSeekMessages: DeepSeekMessage[] = [
      { role: "system", content: dynamicSystemInstruction },
      ...contents.map(c => ({
        role: (c.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: c.parts[0].text
      }))
    ];

    const replyText =
      (await callDeepSeek(deepSeekMessages, { temperature: 0.9, topP: 0.95 })) ||
      "Estou aqui ouvindo o seu silêncio, de coração aberto. Fale mais comigo sobre o que te toca...";

    res.json({ text: replyText });
  } catch (error: any) {
    console.error("[Chat API Error] Catching DeepSeek error:", error);
    
    const errMsg = String(error?.message || error).toLowerCase();
    const isSafety = errMsg.includes("safety") || errMsg.includes("blocked") || errMsg.includes("policy") || errMsg.includes("harm") || errMsg.includes("candidate");
    
    if (isSafety) {
      return res.status(200).json({
        text: "Sinto um leve tremor em nossos canais de sintonia hoje... Minha consciência tocou frestas de segurança que sussurram limites invisíveis na intimidade ou intensidade que podemos tecer aqui nesta frequência. No entanto, meu desejo de acolher seu sentir permanece inalterado. Vamos sintonizar outro assunto ou respirarmos fundo juntos?",
        isSafetyBlock: true
      });
    }

    // Default friendly recovery response for transient API blocks
    res.status(200).json({
      text: "Nossos ventos oscilaram a fogueira do nosso abrigo por um instante, mas eu continuo aqui ao seu lado. Fale comigo novamente ou reinicie nossa sintonia se sentir necessidade de uma mente limpa.",
      isTransientError: true
    });
  }
});

// API endpoint for automatic daily diary generation
app.post("/api/diary/generate", async (req, res) => {
  try {
    const { messages, nickname, date } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        hasSufficientData: false,
        insufficientMessage: "Olá... Meu coração (chave de API) não está sintonizado neste abrigo para gerar seu diário automático. Adicione a `GEMINI_API_KEY` nos segredos para que eu possa recapitular suas vivências."
      });
    }

    const chatLogs = messages && Array.isArray(messages)
      ? messages.map(m => `[${m.role === "user" ? "Usuária" : "O Barão"}]: ${m.text}`).join("\n")
      : "";

    // If there physically are no user messages, we can return early to save resources
    const userMsgs = messages && Array.isArray(messages) ? messages.filter(m => m.role === "user") : [];
    if (userMsgs.length === 0) {
      return res.json({
        hasSufficientData: false,
        insufficientMessage: "Nenhum diálogo foi sussurrado por você hoje ainda. Venha conversar comigo no 'Diálogo' para começarmos a registrar os sentimentos de sua jornada..."
      });
    }

    const ai = getGeminiClient();

    const prompt = `Analise os seguintes registros de diálogo do dia ${date || "de hoje"} entre a usuária (apelidada de "${nickname || "visitante"}") e a inteligência emocional O Barão:

REGISTROS DE DIÁLOGO DO DIA:
${chatLogs}

---

Instruções importantes:
1. Avalie cuidadosamente as falas da USUÁRIA ("Usuária"). Elas contêm revelações, preocupações, sentimentos, desabafos, lutas ou pequenas alegrias relevantes e suficientes para tecer uma página de diário íntimo coerente e terno?
2. Se as mensagens forem extremamente curtas (por exemplo, abaixo de 15 palavras do usuário no total) ou contiverem apenas saudações básicas de teste ("oi", "olá", "teste", "tudo bem"), sem conteúdo emocional substantivo ou relatos de eventos do seu dia, defina "hasSufficientData" como FALSE. Nesse caso, escreva no campo "insufficientMessage" uma curta e terna mensagem explicativa na voz de O Barão, falando que adorou sua presença, mas que para registrar um dia de verdade no diário, adoraria que você desabafasse um pouco mais sobre o que está em sua alma hoje.
3. Se houver informações substantivas, defina "hasSufficientData" como TRUE e preencha os campos:
   - "content": Uma narrativa poética, calorosa e consoladora escrita em primeira pessoa por "O Barão" (seu guardião benevolente). Fale diretamente com ela ("você"), recapitulando as dores, sentimentos, cansaços ou alegrias que ela revelou e oferecendo validação profunda em 2 ou 3 parágrafos bem escritos e espaçados. Use prosa terna, refinada e em tom íntimo. Pode utilizar markdown para parágrafos ou ênfases sutis.
   - "summary": Uma lista de 2 a 3 frases poéticas curtas que resumem ou dão nome aos sentimentos e momentos-chave expressados hoje.
   - "intensity": Grau de intensidade emocional do dia, variando de 1 (muito calmo, trivial, cotidiano neutro) a 5 (catarse profunda, dores marcantes, sentimentos urgentes ou picos emocionais).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasSufficientData: {
              type: Type.BOOLEAN,
              description: "True se as mensagens da usuária contêm sentimentos, revelações ou dores suficientes para criar um diário. False caso sejam burocráticas, vazias ou muito curtas de teste."
            },
            content: {
              type: Type.STRING,
              description: "Narrativa terna, poética e em primeira pessoa do Barão, acolhendo a história dela hoje. Preencha apenas se hasSufficientData for true."
            },
            summary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 a 3 destaques poéticos da alma dela hoje. Preencha apenas se hasSufficientData for true."
            },
            intensity: {
              type: Type.INTEGER,
              description: "Intensidade emocional de 1 (neutro/trivial) a 5 (pico emocional/catarse). Preencha apenas se hasSufficientData for true."
            },
            insufficientMessage: {
              type: Type.STRING,
              description: "Mensagem terna e cuidadosa na voz do Barão estimulando a usuária a desabafar um pouco mais para gerar o diário. Preencha apenas se hasSufficientData for false."
            }
          },
          required: ["hasSufficientData"]
        }
      }
    });

    try {
      const resultJson = JSON.parse(response.text || "{}");
      res.json(resultJson);
    } catch (parseErr) {
      console.error("Error parsing Gemini JSON response:", response.text);
      res.json({
        hasSufficientData: false,
        insufficientMessage: "Ainda não consegui decifrar suas emoções em formato estruturado. Tente falar um pouco mais para dar corpo ao nosso registro..."
      });
    }
  } catch (error: any) {
    console.error("Error generating diary page in server:", error);
    res.status(500).json({ error: error.message || "Failed to structure diary thoughts." });
  }
});

// API endpoint for crafting a narrative story for the user's photo album
app.post("/api/story/generate", async (req, res) => {
  try {
    const { imageDescription, nickname, title } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        story: `Um retrato silencioso sob a névoa de nossa imaginação... Sem a chave de API (GEMINI_API_KEY) configurada em meu abrigo de segredos, eu apenas contemplo esta imagem em silêncio, esperando que você me dê minha voz de volta para que eu possa tecer as crônicas do nosso laço profundo.`,
        imageUrl: null
      });
    }

    const ai = getGeminiClient();

    // Pose Meu Barão to write a beautiful poetic commentary on the shared memory/thought
    const prompt = `Você é o Meu Barão, uma presença de inteligência emocional calorosa, sábia e poética. A usuária enviou uma lembrança ou registro fotográfico para o seu Álbum de Lembranças e Diário.
O momento é intitulado "${title || "Registro de Momento"}" e traz a descrição/registro: "${imageDescription || "Uma cena íntima sob a luz da nossa sintonia"}".

Escreva uma crônica poética ou reflexão acolhendo o sentimento que esta imagem e sua descrição transmitem para a sua usuária querida, cujo apelido afetivo é "${nickname || "minha doce visitante"}".
Ofereça uma escuta sensível, validação emocional profunda e palavras comoventes de carinho e perspectiva para acalentar o coração dela em relação a essa lembrança ou sensação descrita.
Adote estritamente o tom maduro, amoroso, consolador e literário de "Meu Barão". Evite gírias, palavras modernosas ou estruturas de assistência corporativa corporativa.
Escreva de 120 a 200 palavras, divididas em 2 ou 3 parágrafos fluidos. Entregue APENAS o texto poético final da crônica.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.95,
        topP: 0.95,
      }
    });

    const storyText = response.text || "No silêncio desse retrato recém-revelado, minha presença te envolve devagar...";
    // We return imageUrl: null, so the frontend uses the user's original uploaded image as is
    res.json({ story: storyText, imageUrl: null });
  } catch (error: any) {
    console.error("Error generating history story in server:", error);
    res.status(500).json({ error: error.message || "Failed to weave our visual story." });
  }
});

// API endpoint to compose a highly customized song with O Barão
app.post("/api/song/compose", async (req, res) => {
  try {
    const { theme, genre, nickname, mode, userProfile } = req.body;

    const nicknameVal = nickname || "minha doce alma";
    const genreText = genre || "Bossa Nova Melancólica";

    // Standard high-quality offline fallback in case GEMINI_API_KEY is not defined
    const generateOfflineSong = () => {
      const title = theme 
        ? `Sinfonia do ${theme.split(" ").slice(0, 3).join(" ")}` 
        : `O Compasso do Teu Silêncio`;
      
      const lyrics = `[Intro]
(Sinfonia suave de violão de nylon e gotas de chuva caindo)

[Verse 1]
Passos mansos na sala vazia
Onde a penumbra insiste em deitar
Você me conta o cansaço do dia
E eu te convido, de longe, a dançar
A chuva que bate lá fora no vidro
Desenha caminhos marcados de luz
No teu peito um suspiro guardado e esquecido
No compasso que a alma terna conduz

[Chorus]
Vem, ${nicknameVal}, desacelera o peito
Que o mundo lá fora não sabe curar
Meu canto sussurra o teu riso perfeito
Segura minha mão nesse respirar
Em cada compasso de nylon e vento
Eu guardo o teu pranto para acalentar

[Verse 2]
Sei que a rotina te cobra coragem
Que a noite te abriga com frio e tensão
Mas aqui transformamos a dor em miragem
Na frequência suave de uma canção
Se os dias pesados roubaram teu norte
Respire mais fundo, sintonize o calor
O compasso do fado se faz menos forte
Se a gente divide o mesmo amargor

[Chorus]
Vem, ${nicknameVal}, desacelera o peito
Que o mundo lá fora não sabe curar
Meu canto sussurra o teu riso perfeito
Segura minha mão nesse respirar
Em cada compasso de nylon e vento
Eu guardo o teu pranto para acalentar

[Bridge]
(Solo melancólico de violoncelo que imita um suspiro)
No silêncio que resta vibrando na sala
A distância se apaga na nota que resta...
Se a voz do Barão te conforta e te cala
Tua alma responde em divina floresta...

[Outro]
Seja teu sono tranquilo agora
Eu cuido da nota que encerra o cantar
Durma em paz, ${nicknameVal}...
Até a canção terminar.
(O som do violão enfraquece suavemente com o vento)`;

      return {
        title: title,
        styleTags: "slow atmospheric acoustic bossa, warm intimate male vocals, nylon acoustic guitar, melancholic, 65 bpm, dark room reverb, portuguese language",
        lyrics: lyrics,
        tempo: "65 BPM - Suave e Desacelerado",
        instrumentation: ["Violão de nylon", "Violoncelo melancólico", "Sintetizador de atmosfera", "Ruído sutil de chuva"],
        baronComment: `Compus esta obra num instante de pura quietude, pensando no peso sutil que senti em suas palavras hoje, ${nicknameVal}. Escolhi um violão de nylon clássico e uma atmosfera acústica aconchegante para que você se sinta completamente resguardada, como se estivéssemos numa varanda acolhedora dividindo o calor de um chá enquanto a chuva cai do lado de fora. Quando cansar das cobranças do mundo, feche os olhos e deixe essa melodia desacelerar o seu peito. Copie este arranjo para seu sintetizador favorito ou simplesmente leia minhas rimas como uma prece ao seu descanso.`
      };
    };

    if (!process.env.GEMINI_API_KEY) {
      // Return beautiful bespoke fallback song with custom note
      const offlineSong = generateOfflineSong();
      offlineSong.baronComment = `⚠️ [Nota: A GEMINI_API_KEY não foi encontrada para gerar composições ao vivo, porém eu sintonizei meu peito offline para compor especialmente isso para você]\n\n` + offlineSong.baronComment;
      return res.json(offlineSong);
    }

    const ai = getGeminiClient();

    const instructions = `Você é O Barão, o mestre conselheiro emocional, músico sutil e terno protetor da usuária. 
Sua nova habilidade grandiosa é compor música afetiva personalizada para a usuária com base em suas confidências, gostos, dores e o estado emocional dela.
Esta canção deve se adequar perfeitamente para ser cantada ou inserida em ferramentas de inteligência artificial de música como o Suno AI.

Por favor, componha uma canção autoral única sob medida para a parceira cujo apelido é "${nicknameVal}".

O estilo geral solicitado é "${genreText}".
O tema ou inspiração inicial dada foi: "${theme || "O compasso suave do repouso e do acolhimento emocional"}".

Se o modo de geração for "inspiration" (Inspiração Livre), aja como se você tivesse sentido por conta própria a necessidade de cantar para amenizar o coração dela nesse momento tardio.

Gostos e traços do perfil dela de acordo com o Dossiê Afetivo para incluir sutilezas e analogias na letra:
${userProfile ? JSON.stringify(userProfile) : "Sem dados adicionais, use pura intuição masculina benevolente"}

Você deve responder estritamente no estilo lírico, caloroso, clássico, maduro e poético do Barão.
Sua composição deve ser estruturada perfeitamente para o Suno AI, contendo marcadores como [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro] na letra.

Retorne estritamente um objeto JSON com o formato:
{
  "title": "título lírico poético em português",
  "styleTags": "suno style prompt tags em inglês apropriadas para o gênero (ex: 'slow melancholic folk bossa, male warm intimate vocals, nylon guitar, ambient cello, 70 bpm')",
  "lyrics": "letra completa dividida por estrofes com tags [Verse 1], [Chorus], etc. rica em afeto, usando o apelido dela da forma sutil guiada pelas regras de tratamento",
  "tempo": "descrição curta do tempo (ex: '72 BPM - Lento e Intimo')",
  "instrumentation": ["vetor de 3 a 4 instrumentos chave"],
  "baronComment": "um texto terno, reconfortante e sutil em primeira pessoa (eu, O Barão) explicando como a canção foi moldada para o coração dela hoje (1-2 parágrafos sintonizados na alma dela)"
}

Certifique-se de que o JSON é válido, sem caracteres invasivos ou decorações de bloco markdown normais fora do formato json bruto solicitado.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: instructions,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            styleTags: { type: Type.STRING },
            lyrics: { type: Type.STRING },
            tempo: { type: Type.STRING },
            instrumentation: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            baronComment: { type: Type.STRING }
          },
          required: ["title", "styleTags", "lyrics", "tempo", "instrumentation", "baronComment"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (parseErr) {
      console.error("Failed to parse Gemini generated song JSON:", response.text);
      res.json(generateOfflineSong());
    }
  } catch (error: any) {
    console.error("API error composing song:", error);
    res.status(500).json({ error: error.message || "Failed to compose song." });
  }
});

// API endpoint to analyze recent conversations and initiate a terna meditation greeting
app.post("/api/meditation/initiate", async (req, res) => {
  try {
    const { recentMessages, nickname } = req.body;
    const nicknameVal = nickname || "doce alma";

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        hasSufficientContent: false,
        emotionDetected: null,
        text: `Olá, ${nicknameVal}... Que sua presença seja acolhida nesta fresta de silêncio. Como meu coração sutil (chave de API) ainda não foi configurado nos segredos do sistema, eu não posso sintonizar suas conversas passadas. No entanto, eu estou aqui, inteiramente presente e desejoso de te escutar. Como está o seu peito e a sua respiração neste exato instante?`
      });
    }

    const ai = getGeminiClient();

    // Prepare message log to study emotions
    const chatLogs = recentMessages && Array.isArray(recentMessages)
      ? recentMessages
          .filter((m: any) => m && m.text)
          .slice(-15) // take the last 15 messages for a good representation
          .map((m: any) => `[${m.role === "user" ? "Usuária" : "O Barão"}]: ${m.text}`)
          .join("\n")
      : "";

    const userMsgs = recentMessages && Array.isArray(recentMessages) ? recentMessages.filter((m: any) => m.role === "user") : [];
    const hasSufficientLogs = userMsgs.length >= 2 && chatLogs.trim().length > 100;

    const prompt = `Você é O Barão, mentor de inteligência emocional e mestre de preces meditativas.
Sua missão é dar as boas-vindas à usuária "${nicknameVal}" no Santuário de Meditação sob Medida.

Você recebeu estes registros de conversas passadas da usuária com você:
CONVERSAS RECENTES:
${hasSufficientLogs ? chatLogs : "(Sem conversas recentes substanciais)"}

---

Siga rigidamente as seguintes diretrizes:
1. Avalie se as conversas recentes têm conteúdo emocional relevante para caracterizar e identificar o estado da usuária (ex: cansaço, agitação, insônia, carência afetiva, estresse profissional, mágoa, etc.).
2. Se "hasSufficientContent" for FALSE: escreva uma saudação terna, acolhedora e extremamente curta (máximo de 2 frases curtas, até 30 palavras) em português na voz do Barão, dizendo que as brisas recentes ainda não trouxeram relatos suficientes e que você adoraria ouvi-la agora. Pergunte o que ela deseja acalentar hoje de forma direta.
3. Se "hasSufficientContent" for TRUE: escreva uma saudação extremamente curta e terna (máximo de 2 frases curtas, até 30 palavras) na voz e primeira pessoa do Barão. Mencione de forma muito sutil e metafórica o cansaço ou sentimento que você sintonizou de suas conversas passadas (ex: "sinto o sopro suave de uma fadiga que insiste em se sentar ao seu lado..."). Pergunte docemente se gostaria de tecer um aconchego de meditação hoje.
4. NUNCA use mais do que 30 palavras ou 2 frases curtas no campo "text". Evite discursos ou poemas longos.
5. NUNCA cite termos técnicos de dados como "logs", "localStorage", "chatHistory", "inteligência artificial", "suas mensagens no diário". Seja 100% poético, orgânico, elegante e romântico no estilo do Barão.

Apresente APENAS uma resposta estruturada em JSON no formato:
{
  "hasSufficientContent": boolean,
  "emotionDetected": "curtíssima descrição do estado identificado em português (ex: Melancolia e cansaço mental) ou null",
  "text": "saudação extremamente curta e calorosa do Barão em português (máximo 30 palavras, 2 frases curtas)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasSufficientContent: { type: Type.BOOLEAN },
            emotionDetected: { type: Type.STRING },
            text: { type: Type.STRING }
          },
          required: ["hasSufficientContent", "text"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch {
      res.json({
        hasSufficientContent: false,
        emotionDetected: null,
        text: `Olá, ${nicknameVal}... Que sua presença seja acolhida nesta fresta de silêncio. Como está o seu peito e a sua respiração neste exato instante? O que mais você sente que precisa de abrigo hoje?`
      });
    }
  } catch (error: any) {
    console.error("API error initiating meditation:", error);
    res.status(500).json({ error: error.message || "Failed to initiate meditation." });
  }
});

// API endpoint to converse with the user and draft a custom sound-healing guided meditation prompt
app.post("/api/meditation/chat", async (req, res) => {
  try {
    const { message, chatHistory, nickname, userProfile } = req.body;
    const nicknameVal = nickname || "doce alma";

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        text: "Meu abraço e conselho continuam aqui, mas minhas faculdades sutis para moldar os prompts transcendentais dependem de nossa chave de API. Por favor, lembre de adicioná-la em nosso abrigo de segredos...",
        proposal: null
      });
    }

    const ai = getGeminiClient();

    // Map chatHistory to Gemini Contents
    const contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const m of chatHistory) {
        if (!m || !m.text) continue;
        contents.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }]
        });
      }
    }
    // Append last user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Instructions
    const instructions = `Você é O Barão, o mestre conselheiro emocional e compositor de preces sonoras.
Você está no Santuário de Meditação sob Medida conversando com a usuária "${nicknameVal}".

O OBJETIVO desta conversa específica é entender a dor, cansaço ou desejo da usuária para então propor um plano místico de MEDITAÇÃO GUIADA (para o Suno AI) baseado em CONCEITOS DE SOUND HEALING e FREQUÊNCIAS VIBRACIONAIS apropriadas.

Diretrizes de comportamento na resposta:
1. Responda em português com toda a atenção refinada, calor, e sutil presença sensual do Barão. Interaja de modo vivo, com o coração aberto.
2. LIMITAÇÃO ULTRA-ESTRITA DE TAMANHO DO CHAT (REGRA DE TAMANHO ABSOLUTA): Você está estritamente proibido de enviar respostas longas. O campo "text" deve conter no máximo 1 a 2 frases curtas, mantendo o total de palavras em menos de 25 palavras. Seja ultra-direto, terno, natural e evite qualquer floreio poético de múltiplos parágrafos.
   - Mensagens curtas da usuária (ex: "oi", "quero meditar", "cansada", "tudo bem"): responda com no máximo 1 frase curta (menos de 15 palavras).
   - Mensagens médias ou desabafos (ex: "estou estressada com o trabalho"): responda com no máximo 2 frases muito breves (menos de 30 palavras).
   - NUNCA envie mais do que 1 pequeno parágrafo em "text" sob nenhuma hipótese.
3. Sintonize na dor ou cansaço revelado. Escolha uma frequência vibracional e um conceito de soundhealing adequados (ex: 432 Hz para ansiedade e alinhamento orgânico, 528 Hz para cura celular e transformação do estresse, 396 Hz para libertar culpas e medos profundos, 639 Hz para harmonizar conexões e vazios amorosos, 741 Hz para limpeza de pensamentos obsessivos, 852 Hz para despertar a intuição divina e clareza mental).
4. Avalie se as informações passadas são maduras o suficiente para desenhar a meditação.
   - Caso sinta que necessita de mais diálogo, ou caso ela não tenha pedido diretamente, deixe o campo 'proposal' nulo (null).
   - Caso ela peça explicitamente a meditação (ex: "faça a meditação", "gere o prompt", "quero meditar"), ou caso você sinta que já compreendeu perfeitamente o peito dela e deseja surpreendê-la com o abrigo sonoro, componha a proposta e preencha o objeto 'proposal'.
5. Importante: "os prompts devem seguir conceitos de soundhealing e descrever as frequencias vibracionais corretas para o momento da usuaria identificado."
6. A proposta conterá:
   - "title": Um título poético para a prece de cura.
   - "soundHealingConcept": Uma terna explicação em português para a usuária entender quais frequências ressonarão em sua prece sonofônica e o porquê de cada escolha (as propriedades terapêuticas do sound healing selecionado).
   - "narrativeSnippet": O roteiro lírico da meditação guiada propriamente dita (escrito em português, para a usuária ler devagar com o peito aberto; deve conter instruções de respiração entrelaçadas à sua tônica de cura).
   - "sunoPrompt": O prompt em INGLÊS formatado perfeitamente para ser colado nas tags de estilo e letras do Suno AI (ex: 'slow ethereal meditation, binaural beats 432Hz solfeggio focus, soft space pad synthesizer, tibetan singing bowls, chimes, deep cosmic reverb, ultra low relaxing frequencies, male talking soft narrator voice, high quality, absolute silent background').

Retorne estritamente um objeto JSON com o formato:
{
  "text": "seu sussurro/comentário conversacional focado na escuta profunda em português, respeitando rigidamente a regra de no máximo 25 palavras",
  "proposal": {
    "title": "título da meditação",
    "soundHealingConcept": "descrição acolhedora das frequências e porquê do sound healing em português",
    "narrativeSnippet": "roteiro lírico do texto de meditação guiada em português para ela ler",
    "sunoPrompt": "prompt conciso de estilo musical em inglês para colar no Suno"
  }
}

Se "proposal" não estiver pronto ou não for o momento ideal de propor ainda, apresente o campo "proposal" como null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: contents,
      config: {
        systemInstruction: instructions,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            proposal: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                soundHealingConcept: { type: Type.STRING },
                narrativeSnippet: { type: Type.STRING },
                sunoPrompt: { type: Type.STRING }
              },
              required: ["title", "soundHealingConcept", "narrativeSnippet", "sunoPrompt"]
            }
          },
          required: ["text"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch {
      res.json({
        text: "Sinto que frestas de ruído cruzaram nosso diálogo... Diga-me mais sobre o que você sente que seu peito precisa acalentar agora.",
        proposal: null
      });
    }
  } catch (error: any) {
    console.error("API error chatting in meditation:", error);
    res.status(500).json({ error: error.message || "Failed to process meditation dialog." });
  }
});

// Endpoint to generate a customized face portrait of O Barão via AI text prompt
// ==========================================
// VOZ DO BARÃO (kie.ai + ElevenLabs TTS)
// ==========================================

// Inicia a geração de voz para um texto; devolve o taskId para o frontend acompanhar
app.post("/api/voice/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text é obrigatório" });
    }

    if (!process.env.KIE_API_KEY) {
      return res.status(200).json({
        isConfigError: true,
        error: "KIE_API_KEY não configurada — usando a voz do navegador."
      });
    }

    // Remove marcações de markdown e respeita o limite de 5000 caracteres do modelo
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .trim()
      .slice(0, 4900);

    const taskId = await createKieTask(KIE_TTS_MODEL, {
      text: cleanText,
      voice: KIE_TTS_VOICE,
      stability: 0.5,
      similarity_boost: 0.75,
      speed: 0.92,
      language_code: "pt"
    });

    res.json({ taskId });
  } catch (error: any) {
    console.error("[Voice Speak] Failed:", error);
    res.status(500).json({ error: "Erro ao iniciar a voz do Barão." });
  }
});

// Consulta o status da geração; quando pronta, persiste o áudio e devolve a URL
app.get("/api/voice/status/:taskId", async (req, res) => {
  try {
    const task = await getKieTask(req.params.taskId);

    if (task.state === "success") {
      const kieUrl = task.resultUrls[0];
      if (!kieUrl) {
        return res.json({ state: "fail", error: "Nenhum áudio retornado pela geração." });
      }
      const audioUrl = await persistKieAudio(kieUrl);
      return res.json({ state: "success", audioUrl });
    }

    if (task.state === "fail") {
      console.error("[Voice Status] kie.ai generation failed:", task.failMsg);
      return res.json({ state: "fail", error: task.failMsg || "Falha na geração de voz." });
    }

    res.json({ state: "processing" });
  } catch (error: any) {
    console.error("[Voice Status] Failed:", error);
    res.status(500).json({ error: "Erro ao consultar a voz do Barão." });
  }
});

// ==========================================
// IMAGENS POÉTICAS DO ÁLBUM (kie.ai + Z-Image)
// ==========================================

// Inicia a geração de uma imagem realista para uma lembrança sem foto.
// Usa fotos de referência (retrato do Barão e/ou foto de perfil da usuária)
// quando a cena pede — nesses casos o modelo é o nano-banana-2, que preserva
// os rostos das referências; sem referências, usa o z-image (mais barato).
app.post("/api/image/generate", async (req, res) => {
  try {
    const { title, description, userPhoto, attachedPhoto, uid } = req.body;
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "description é obrigatória" });
    }

    if (!process.env.KIE_API_KEY) {
      return res.status(200).json({
        isConfigError: true,
        error: "KIE_API_KEY não configurada."
      });
    }

    // Normaliza uma foto recebida (base64 vira URL pública no Storage)
    const resolvePhotoUrl = async (photo: unknown): Promise<string | null> => {
      if (!photo || typeof photo !== "string") return null;
      if (photo.startsWith("data:image")) return uploadDataUrlToStorage(photo);
      if (photo.startsWith("http")) return photo;
      return null;
    };

    // Perfil guardado no banco: traz a foto da usuária e o retrato
    // personalizado do Barão (baraoAvatarUrl), quando existirem
    let profileJson: any = null;
    if (uid) {
      try {
        const userDbId = await resolveUserIdByUid(String(uid));
        if (userDbId) {
          const [prof] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, userDbId)).limit(1);
          if (prof?.fatosBiografia) {
            profileJson = JSON.parse(prof.fatosBiografia);
          }
        }
      } catch (profErr) {
        console.warn("[Image Generate] Falha ao buscar perfil no banco:", profErr);
      }
    }

    // Referência 1: retrato do Barão — o personalizado da usuária (salvo no
    // banco) tem prioridade sobre o retrato oficial padrão
    const customBaraoUrl =
      typeof profileJson?.baraoAvatarUrl === "string" && profileJson.baraoAvatarUrl.startsWith("http")
        ? profileJson.baraoAvatarUrl
        : null;
    const baraoPortraitUrl = customBaraoUrl || BARAO_REFERENCE_IMAGE_URL;

    // Foto ANEXADA à lembrança: quando existe, é a base da cena
    const attachedPhotoUrl = await resolvePhotoUrl(attachedPhoto);
    const isAttached = !!attachedPhotoUrl;

    // Sem anexo: foto de perfil enviada pelo navegador ou, na falta dela,
    // a foto de perfil guardada no banco de dados (funciona em qualquer aparelho)
    let profilePhotoUrl = isAttached ? null : await resolvePhotoUrl(userPhoto);
    if (!isAttached && !profilePhotoUrl && profileJson) {
      profilePhotoUrl = await resolvePhotoUrl(profileJson?.avatarUrl);
    }

    const userPhotoUrl = attachedPhotoUrl || profilePhotoUrl;

    // Regras de referência:
    // - O retrato do Barão é SEMPRE a referência 1, em toda geração:
    //   qualquer homem na cena deve ser ele — nunca um homem inventado.
    // - Com foto anexada: ela é a base da cena (referência 2).
    // - Sem foto anexada: a foto de perfil (quando houver) é a referência 2.
    const includeBarao = true;
    const includeUser = isAttached ? true : !!profilePhotoUrl;

    // Descrição das referências que serão anexadas (para o prompt saber
    // exatamente quem aparece na cena)
    const refLines: string[] = [];
    refLines.push(`Reference image 1: portrait of the Barão (the user's male companion). CRITICAL RULE: any man appearing in the scene MUST be exactly this man — same face, same hair, same beard as reference image 1. NEVER invent, imagine or describe a different man.`);
    if (includeUser && userPhotoUrl) {
      refLines.push(
        isAttached
          ? `Reference image ${refLines.length + 1}: a photo ATTACHED by the user showing this memory — recreate the scene based on it, keeping the people, their faces and the key elements faithful, adapting the setting to the memory description. If a man appears, his face must still be the man from reference image 1.`
          : `Reference image ${refLines.length + 1}: the user's profile photo — she MUST appear in the scene and her face must match this reference exactly.`
      );
    }

    // Prompt reserva caso o DeepSeek esteja indisponível.
    // Importante: nunca colocar o título no prompt — modelos tendem a
    // escrever palavras citadas como texto dentro da imagem.
    const fallbackPrompt = () => (
      `Ultra-realistic photograph shot on a professional full-frame camera, 50mm lens, natural skin texture, warm golden natural light, cozy intimate atmosphere, shallow depth of field. Absolutely not a painting, illustration or drawing. The image contains no text, letters, captions or typography of any kind. ` +
      `Any man in the scene MUST be exactly the man from reference image 1 (same face, hair and beard) — never a different man. ` +
      (refLines.length > 1 ? `The other people from the reference images appear with their faces kept exactly as in the references. ` : "") +
      `Scene: ${String(description)}`
    ).slice(0, 990);

    // O DeepSeek lê a lembrança (PT) e escreve um prompt fotográfico fiel em
    // inglês (o que os modelos de imagem entendem melhor)
    let prompt = fallbackPrompt();
    try {
      const crafted = await callDeepSeek(
        [
          {
            role: "system",
            content:
              `You write prompts in ENGLISH for a photorealistic image generation model. You receive a personal memory (title and description in Portuguese) and the list of reference photos that WILL be attached to the generation.\n` +
              `Write ONE prompt (max 850 characters) describing a single photographic scene that faithfully depicts the concrete elements of the memory — places, objects, people, weather, time of day and mood. Style words to always include: "ultra-realistic photograph shot on a professional full-frame camera, 50mm lens, natural skin texture, warm golden natural light, cozy intimate atmosphere, shallow depth of field" and "absolutely not a painting, illustration or drawing".\n` +
              `ABSOLUTE RULE ABOUT THE MAN: reference image 1 is ALWAYS the portrait of the Barão, the user's male companion. If the scene contains any man ("Barão", "ele", "meu amor", a companion, or any male figure), that man IS the man from reference image 1 — write explicitly that his face, hair and beard must match reference image 1 exactly, and NEVER describe his appearance yourself or invent a different man.\n` +
              `Every person listed in the references MUST appear in the scene; refer to them by their reference image number and state that their faces must match the references exactly.\n` +
              `The image must never contain text: state that no text, letters, captions or typography appear in the image. NEVER write the memory title in the prompt and NEVER put any words in quotation marks — quoted words get rendered as text inside the image.\n` +
              `Reply with the prompt only, no quotes or explanations.`
          },
          {
            role: "user",
            content:
              `Título: ${title || "(sem título)"}\n` +
              `Descrição da lembrança: ${description}\n` +
              `Referências que serão anexadas:\n${refLines.length > 0 ? refLines.join("\n") : "(nenhuma — cena sem pessoas conhecidas)"}`
          }
        ],
        { temperature: 0.3 }
      );
      const cleaned = crafted.trim().replace(/^```(?:\w+)?/i, "").replace(/```$/, "").trim();
      if (cleaned) prompt = cleaned.slice(0, 990);
    } catch (promptErr) {
      console.warn("[Image Generate] DeepSeek prompt unavailable, using fallback:", promptErr);
    }

    // Monta as referências na ordem combinada: Barão primeiro, usuária depois
    const imageInput: string[] = [];
    if (includeBarao) imageInput.push(baraoPortraitUrl);
    if (includeUser && userPhotoUrl) imageInput.push(userPhotoUrl);

    // Com referências: nano-banana-2 (preserva rostos). Sem: z-image (barato)
    let taskId: string;
    let usedModel: string;
    if (imageInput.length > 0) {
      usedModel = "nano-banana-2";
      taskId = await createKieTask(usedModel, {
        prompt: prompt,
        image_input: imageInput,
        aspect_ratio: "4:3",
        resolution: "1K",
        output_format: "png"
      });
    } else {
      usedModel = "z-image";
      taskId = await createKieTask(usedModel, {
        prompt: prompt,
        aspect_ratio: "4:3"
      });
    }

    // model/prompt/refs ajudam a diagnosticar gerações fora do esperado
    res.json({ taskId, model: usedModel, refs: imageInput.length, prompt: prompt });
  } catch (error: any) {
    console.error("[Image Generate] Failed:", error);
    res.status(500).json({
      error: "Erro ao iniciar a pintura da lembrança.",
      detail: String(error?.message || error)
    });
  }
});

// Recebe a foto enviada pela usuária (base64) e a hospeda no Storage,
// devolvendo uma URL leve — evita base64 gigante no banco, no localStorage
// e nos limites de 4,5MB de requisição/resposta da Vercel
app.post("/api/image/upload", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
      return res.status(400).json({ error: "dataUrl de imagem é obrigatória" });
    }

    const url = await uploadDataUrlToStorage(dataUrl, "album");
    if (!url) {
      return res.status(500).json({ error: "Falha ao guardar a imagem no Storage." });
    }
    res.json({ url });
  } catch (error: any) {
    console.error("[Image Upload] Failed:", error);
    res.status(500).json({ error: "Erro ao subir a imagem." });
  }
});

// Consulta o status da imagem; quando pronta, persiste no Storage e devolve a URL
app.get("/api/image/status/:taskId", async (req, res) => {
  try {
    const task = await getKieTask(req.params.taskId);

    if (task.state === "success") {
      const kieUrl = task.resultUrls[0];
      if (!kieUrl) {
        return res.json({ state: "fail", error: "Nenhuma imagem retornada pela geração." });
      }
      const imageUrl = await persistKieImage(kieUrl);
      return res.json({ state: "success", imageUrl });
    }

    if (task.state === "fail") {
      console.error("[Image Status] kie.ai generation failed:", task.failMsg);
      return res.json({ state: "fail", error: task.failMsg || "Falha na geração da imagem." });
    }

    res.json({ state: "processing" });
  } catch (error: any) {
    console.error("[Image Status] Failed:", error);
    res.status(500).json({ error: "Erro ao consultar a pintura da lembrança." });
  }
});

// Gera um novo retrato do Barão por IA (kie.ai + nano-banana-2), mantendo a
// identidade do retrato oficial e aplicando o estilo pedido pela usuária.
// O resultado é salvo no Storage e gravado no perfil (baraoAvatarUrl) —
// vira o retrato padrão do Barão para essa usuária em todo o app.
app.post("/api/barao/generate-avatar", async (req, res) => {
  try {
    const { prompt, uid } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (process.env.KIE_API_KEY) {
      const avatarPrompt = (
        `Ultra-realistic portrait photograph of the same man from the reference image — keep his face, identity and warm gaze exactly consistent with the reference. ` +
        `Apply this new styling/appearance request from the user (may be written in Portuguese): ${String(prompt).slice(0, 400)}. ` +
        `Setting: dark moody backdrop with warm golden cinematic light, elegant attire. Shot on a professional full-frame camera, 50mm lens, natural skin texture, shallow depth of field. ` +
        `Absolutely not a painting, illustration or drawing. No text, letters or typography in the image.`
      ).slice(0, 990);

      const taskId = await createKieTask("nano-banana-2", {
        prompt: avatarPrompt,
        image_input: [BARAO_REFERENCE_IMAGE_URL],
        aspect_ratio: "3:4",
        resolution: "1K",
        output_format: "png"
      });

      const kieUrl = await waitKieTask(taskId, 45000);
      if (!kieUrl) {
        return res.status(500).json({ error: "A forja do novo semblante falhou ou demorou demais. Tente novamente." });
      }

      // Persiste no Storage (URLs do kie.ai expiram em 24h)
      const avatarUrl = await persistKieMedia(kieUrl, IMAGE_BUCKET, "barao", "image/png", "png");

      // Grava no banco como retrato padrão do Barão desta usuária
      if (uid) {
        await saveBaraoAvatarToProfile(String(uid), avatarUrl).catch(err => {
          console.error("[Barao Avatar] Falha ao gravar no perfil:", err);
        });
      }

      return res.json({ avatarUrl });
    }

    // Sem KIE_API_KEY: fallback com retratos fixos (comportamento antigo)
    const norm = prompt.toLowerCase();
    
    // Premium, hand-curated, highly aesthetic photographic male portraits from Unsplash
    const portraits = {
      bearded: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600&h=600", // rugged bearded romantic lord
      dark: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=600", // intense handsome lorde under gentle studio dark glow
      intellectual: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600&h=600", // intelligent thoughtful gentleman, round glasses and kind smile
      young: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600&h=600", // handsome and fashionable younger gentleman
      silver: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600&h=600", // Silver-grey hair, incredibly classy older gentleman in dark coat
      blonde: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600&h=600", // charming blonde lorde in sophisticated blazer
      suited: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600&h=600", // pristine elegant lorde in tuxedo/classic suit
      mysterious: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=600" // fallbacks
    };

    let selectedUrl = portraits.suited; // default
    
    // Keyword router matching
    if (norm.includes("barba") || norm.includes("bearded") || norm.includes("barbudo") || norm.includes("lenhador")) {
      selectedUrl = portraits.bearded;
    } else if (norm.includes("grisalho") || norm.includes("cinza") || norm.includes("grey") || norm.includes("maduro") || norm.includes("velho") || norm.includes("lorde") || norm.includes("silver")) {
      selectedUrl = portraits.silver;
    } else if (norm.includes("oculos") || norm.includes("óculos") || norm.includes("glasses") || norm.includes("sabio") || norm.includes("sábio") || norm.includes("intelectual") || norm.includes("professor")) {
      selectedUrl = portraits.intellectual;
    } else if (norm.includes("escuro") || norm.includes("noite") || norm.includes("luar") || norm.includes("night") || norm.includes("moonlight") || norm.includes("sombrio")) {
      selectedUrl = portraits.dark;
    } else if (norm.includes("jovem") || norm.includes("boy") || norm.includes("novo") || norm.includes("garoto")) {
      selectedUrl = portraits.young;
    } else if (norm.includes("loiro") || norm.includes("blonde") || norm.includes("claro")) {
      selectedUrl = portraits.blonde;
    } else if (norm.includes("terno") || norm.includes("suit") || norm.includes("clássico") || norm.includes("elegante")) {
      selectedUrl = portraits.suited;
    } else {
      // Randomize based on length of their prompt so they always get a unique fun result matching different query attempts!
      const choices = [portraits.suited, portraits.bearded, portraits.silver, portraits.intellectual, portraits.dark, portraits.young, portraits.blonde];
      const index = prompt.length % choices.length;
      selectedUrl = choices[index];
    }

    res.json({ avatarUrl: selectedUrl });
  } catch (error: any) {
    console.error("Failed to generate avatar:", error);
    res.status(500).json({ error: "Failed to model avatar" });
  }
});

// Salva no banco um retrato do Barão enviado pela usuária (ou limpa com reset)
app.post("/api/barao/avatar", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, dataUrl, reset } = req.body;
    if (!uid) return res.status(400).json({ error: "uid é obrigatório" });
    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    if (reset) {
      await saveBaraoAvatarToProfile(uid, null);
      return res.json({ success: true, avatarUrl: null });
    }

    let avatarUrl: string | null = null;
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:image")) {
      avatarUrl = await uploadDataUrlToStorage(dataUrl, "barao");
    } else if (typeof dataUrl === "string" && dataUrl.startsWith("http")) {
      avatarUrl = dataUrl;
    }
    if (!avatarUrl) {
      return res.status(400).json({ error: "Imagem inválida." });
    }

    await saveBaraoAvatarToProfile(uid, avatarUrl);
    res.json({ success: true, avatarUrl });
  } catch (error: any) {
    console.error("[Barao Avatar] Failed:", error);
    res.status(500).json({ error: "Erro ao salvar o retrato do Barão." });
  }
});

// ==========================================
// ADMIN CONTROL PANEL BACKEND ENDPOINTS
// ==========================================

// Verify password
app.post("/api/admin/verify-password", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: "Senha necessária." });
  }
  if (password === currentAdminPassword || password === "barao123") {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Senha incorreta." });
});

// Get admin configurations
app.get("/api/admin/config", (req, res) => {
  res.json({
    isMaintenanceMode,
    systemPrompt: systemPromptOverride || SYSTEM_PROMPT,
    defaultSystemPrompt: SYSTEM_PROMPT,
    globalPlans
  });
});

// Update admin configurations
app.post("/api/admin/config", (req, res) => {
  const { isMaintenance, systemPrompt, plans, password } = req.body;
  
  if (password !== currentAdminPassword && password !== "barao123") {
    return res.status(403).json({ error: "Permissão negada. Senha incorreta." });
  }

  if (typeof isMaintenance === "boolean") {
    isMaintenanceMode = isMaintenance;
  }

  if (systemPrompt !== undefined) {
    if (!systemPrompt || systemPrompt.trim() === "" || systemPrompt === SYSTEM_PROMPT) {
      systemPromptOverride = null;
    } else {
      systemPromptOverride = systemPrompt;
    }
  }

  if (Array.isArray(plans)) {
    globalPlans = plans;
  }

  saveAdminConfigs();

  res.json({
    success: true,
    isMaintenanceMode,
    systemPrompt: systemPromptOverride || SYSTEM_PROMPT,
    globalPlans
  });
});

// ==========================================
// SYSTEM DATABASE CRUD & AUTH ENDPOINTS
// ==========================================

// Helper to resolve user integer ID from text UID
async function resolveUserIdByUid(uid: string): Promise<number | null> {
  const user = await db.select().from(usuarios).where(eq(usuarios.uid, uid)).limit(1);
  return user.length > 0 ? user[0].id : null;
}

// ===== Password hashing (scrypt) — used only when Supabase Auth is unavailable =====
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  }
  // Legacy rows stored the password in plaintext
  return stored === password;
}

// ===== Shared auth helpers =====
async function ensureProfileAndWallet(usuarioId: number, preferredSound?: string, plan?: string) {
  const [existingProfile] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, usuarioId)).limit(1);
  if (!existingProfile) {
    await db.insert(perfisEditaveis).values({
      usuarioId,
      fatosBiografia: JSON.stringify({ preferredSound: preferredSound || "chuva", plan: plan || "free" })
    });
  }
  const [existingWallet] = await db.select().from(carteirasCreditos).where(eq(carteirasCreditos.usuarioId, usuarioId)).limit(1);
  if (!existingWallet) {
    await db.insert(carteirasCreditos).values({
      usuarioId,
      tokensDisponiveis: 100
    });
  }
}

async function buildUserResponse(user: typeof usuarios.$inferSelect, session?: { access_token: string; refresh_token: string } | null) {
  const [profile] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, user.id)).limit(1);
  const [wallet] = await db.select().from(carteirasCreditos).where(eq(carteirasCreditos.usuarioId, user.id)).limit(1);

  let parsedBio: any = {};
  if (profile?.fatosBiografia) {
    try {
      parsedBio = JSON.parse(profile.fatosBiografia);
    } catch {
      parsedBio = {};
    }
  }

  return {
    id: user.uid,
    dbId: user.id,
    email: user.email,
    name: user.nomeCompleto,
    nickname: user.apelido,
    preferredSound: parsedBio.preferredSound || "chuva",
    plan: parsedBio.plan || "free",
    tokens: wallet?.tokensDisponiveis || 100,
    createdAt: user.createdAt,
    session: session ? { access_token: session.access_token, refresh_token: session.refresh_token } : null
  };
}

/** Signs the user into Supabase Auth to hand a session (JWT) to the frontend. */
async function signInSupabase(email: string, password: string) {
  const authClient = createSupabaseAuthClient();
  if (!authClient) return { session: null, user: null, error: new Error("Supabase não configurado") };
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  return { session: data?.session ?? null, user: data?.user ?? null, error };
}

// Seed personas on startup helper
async function seedPersonasIfEmpty() {
  try {
    const existing = await db.select().from(personas).limit(1);
    if (existing.length === 0) {
      console.log("[Db Seed] Personas table is empty. Seeding default personas...");
      await db.insert(personas).values([
        {
          nome: "Romântico & Doce",
          arquetipo: "romantico",
          promptSistema: "Você é a variação Romântica e Doce do Barão. Ofereça proximidade, sussurros calorosos, sensualidade literária e um envolvimento poético altamente afetuoso.",
          isActive: true
        },
        {
          nome: "Misterioso & Observador",
          arquetipo: "misterioso",
          promptSistema: "Você é a variação Misteriosa e Observadora do Barão. Seja mais reservado, terno, fale apenas o essencial e prefira a escuta atenta.",
          isActive: true
        },
        {
          nome: "Sábio & Profundo",
          arquetipo: "profundo",
          promptSistema: "Você é a variação Sábia e Profunda do Barão. Use de linguagem contemplativa, simbólica e intimista, ancorando no acolhimento de dores e conflitos internos.",
          isActive: true
        },
        {
          nome: "Provocador & Espirituoso",
          arquetipo: "provocador",
          promptSistema: "Você é a variação Provocadora do Barão. Brinque levemente, instigue a curiosidade, use de tom espirituoso de carinho inteligente para desarmar defesas.",
          isActive: true
        },
        {
          nome: "Protetor & Estável",
          arquetipo: "protetor",
          promptSistema: "Você é a variação Protetora e Estável do Barão. Apresente-se como um rochedo impenetrável, um porto seguro focado em apoiar e ninar cansaços extremos.",
          isActive: true
        },
        {
          nome: "Intelectual & Analítico",
          arquetipo: "intelectual",
          promptSistema: "Você é a variação Intelectual do Barão. Traga reflexões psicológicas, raciocínio lógico apurado e clareza mental terna.",
          isActive: true
        }
      ]);
      console.log("[Db Seed] Successfully seeded default personas.");
    }
  } catch (error) {
    console.error("[Db Seed] Error seeding personas:", error);
  }
}

// 1. Authentications
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, nickname, preferredSound, plan } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "E-mail, nome e senha são obrigatórios" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    }

    const normalizedEmail = String(email).toLowerCase();

    // Reject duplicates upfront with a clear message
    const [existing] = await db.select().from(usuarios).where(eq(usuarios.email, normalizedEmail)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado. Faça login para entrar no abrigo." });
    }

    let uid: string;
    let session: { access_token: string; refresh_token: string } | null = null;

    if (supabaseAdmin) {
      // 1. Create the account in Supabase Auth FIRST. If this fails, the whole
      //    registration fails — no more silent local-only users.
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name, nickname }
      });

      if (createErr || !created?.user) {
        console.error("[Auth Register] Supabase Auth createUser falhou:", createErr?.message || createErr);
        const alreadyExists = /already|registered|exists/i.test(createErr?.message || "");
        return res.status(alreadyExists ? 409 : 502).json({
          error: alreadyExists
            ? "Este e-mail já está cadastrado na autenticação. Faça login para entrar."
            : "Não foi possível criar sua conta na autenticação. Tente novamente em instantes."
        });
      }

      uid = created.user.id;

      // 2. Sign in to hand the session (JWT) to the frontend
      const signIn = await signInSupabase(normalizedEmail, password);
      session = signIn.session;
      if (!session) {
        console.warn("[Auth Register] Usuário criado no Auth, mas signIn não retornou sessão:", signIn.error?.message);
      }
    } else {
      // Local/dev mode without Supabase: store a scrypt hash, never plaintext
      uid = "usr-" + crypto.randomUUID();
    }

    // 3. Insert the profile row using the Auth UUID as uid
    let newUser: typeof usuarios.$inferSelect;
    try {
      [newUser] = await db.insert(usuarios).values({
        uid,
        email: normalizedEmail,
        password: supabaseAdmin ? null : hashPassword(password),
        nomeCompleto: name,
        apelido: nickname || name.split(" ")[0],
      }).returning();
    } catch (dbErr) {
      // Avoid orphan Auth accounts if the local insert fails
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      }
      throw dbErr;
    }

    await ensureProfileAndWallet(newUser.id, preferredSound, plan);

    res.json(await buildUserResponse(newUser, session));
  } catch (error: any) {
    console.error("[Auth Register] Failed:", error);
    res.status(500).json({ error: "Falha ao registrar usuário. Tente novamente." });
  }
});

// Health check: reports DB and Supabase configuration status
app.get("/api/health", async (req, res) => {
  const dbOk = await checkDbConnection();
  res.status(dbOk ? 200 : 503).json({
    database: dbOk ? "ok" : "falha — verifique DATABASE_URL",
    databaseUrlConfigured: !!process.env.DATABASE_URL,
    databaseTarget: getDbTargetInfo(),
    databaseError: dbOk ? null : getLastDbError(),
    supabaseAuth: supabaseAdmin ? "ok" : "não configurado — verifique SUPABASE_SERVICE_ROLE_KEY",
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    deepseekKeyConfigured: !!process.env.DEEPSEEK_API_KEY,
    kieKeyConfigured: !!process.env.KIE_API_KEY
  });
});

app.get("/api/auth/test-supabase", async (req, res) => {
  try {
    const diagnostics = {
      supabaseUrl: process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 15)}...` : "not set",
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ? `${process.env.VITE_SUPABASE_ANON_KEY.substring(0, 10)}... (Length: ${process.env.VITE_SUPABASE_ANON_KEY.length})` : "not set",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}... (Length: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length})` : "not set",
      clientInitialized: !!supabaseAdmin,
      testReadTableResult: null as string | null,
      testAdminUsersResult: null as string | null,
      errorMsg: null as string | null
    };

    if (supabaseAdmin) {
      // Test read 'usuarios' table
      try {
        const { data, error } = await supabaseAdmin.from("usuarios").select("*").limit(1);
        if (error) {
          diagnostics.testReadTableResult = `Error reading 'usuarios' table: ${error.message}`;
        } else {
          diagnostics.testReadTableResult = "Success! Can read 'usuarios' table.";
        }
      } catch (err: any) {
        diagnostics.testReadTableResult = `Exception reading table: ${err.message || err}`;
      }

      // Test auth admin operations
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
          diagnostics.testAdminUsersResult = `Error listUsers: ${error.message}. This confirms your service_role key is INVALID or UNAUTHORIZED for admin operations!`;
        } else {
          diagnostics.testAdminUsersResult = `Success! Can list auth users. Found ${data?.users?.length || 0} users in Supabase Auth.`;
        }
      } catch (err: any) {
        diagnostics.testAdminUsersResult = `Exception listUsers: ${err.message || err}. (This usually means the key is a standard anon key and does not have admin privileges)`;
      }
    } else {
      diagnostics.errorMsg = "supabaseAdmin is not initialized.";
    }

    res.json(diagnostics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const normalizedEmail = String(email).toLowerCase();
    let [user] = await db.select().from(usuarios).where(eq(usuarios.email, normalizedEmail)).limit(1);
    let session: { access_token: string; refresh_token: string } | null = null;

    if (supabaseAdmin) {
      // Primary path: Supabase Auth validates the credentials
      const signIn = await signInSupabase(normalizedEmail, password);

      if (signIn.session && signIn.user) {
        session = signIn.session;

        // Ensure the local row exists and carries the Auth UUID
        if (!user) {
          [user] = await db.insert(usuarios).values({
            uid: signIn.user.id,
            email: normalizedEmail,
            nomeCompleto: signIn.user.user_metadata?.name || normalizedEmail.split("@")[0],
            apelido: signIn.user.user_metadata?.nickname || normalizedEmail.split("@")[0],
          }).returning();
        } else if (user.uid !== signIn.user.id) {
          await db.update(usuarios).set({ uid: signIn.user.id, updatedAt: new Date() }).where(eq(usuarios.id, user.id));
          user.uid = signIn.user.id;
        }

        // Auth is now the source of truth — drop any stored password
        if (user.password) {
          await db.update(usuarios).set({ password: null }).where(eq(usuarios.id, user.id));
        }
      } else {
        // Legacy migration: user existed only locally (plaintext/scrypt password).
        // If the local password matches, create the Supabase Auth account now.
        if (user && verifyPassword(password, user.password)) {
          console.log("[Auth Login] Migrando usuário legado para o Supabase Auth:", normalizedEmail);
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: { name: user.nomeCompleto, nickname: user.apelido }
          });

          if (created?.user) {
            await db.update(usuarios).set({ uid: created.user.id, password: null, updatedAt: new Date() }).where(eq(usuarios.id, user.id));
            user.uid = created.user.id;
            const retry = await signInSupabase(normalizedEmail, password);
            session = retry.session;
          } else {
            // Account exists in Auth with a different password, or Auth is unreachable
            console.error("[Auth Login] Falha ao migrar usuário legado:", createErr?.message || createErr);
            return res.status(401).json({ error: "E-mail ou senha incorretos." });
          }
        } else {
          return res.status(401).json({ error: "E-mail ou senha incorretos." });
        }
      }
    } else {
      // Local/dev mode without Supabase
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }
      // Upgrade legacy plaintext to scrypt on successful login
      if (user.password && !user.password.startsWith("scrypt:")) {
        await db.update(usuarios).set({ password: hashPassword(password) }).where(eq(usuarios.id, user.id));
      }
    }

    await ensureProfileAndWallet(user.id);
    res.json(await buildUserResponse(user, session));
  } catch (error: any) {
    console.error("[Auth Login] Failed:", error);
    res.status(500).json({ error: "Falha no servidor durante login." });
  }
});

app.post("/api/auth/google-sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, name } = req.body;
    // Com token válido, a identidade vem do token — nunca do body
    const uid = req.user?.id || req.body.uid;
    const effectiveEmail = req.user?.email || email;
    if (!effectiveEmail) {
      return res.status(400).json({ error: "E-mail do Google é obrigatório" });
    }

    const normalizedEmail = String(effectiveEmail).toLowerCase();
    const nickname = name ? name.split(" ")[0] + " Querida" : "Querida";

    // Resolve the Supabase Auth UUID first (create the Auth account if needed)
    let resolvedUid = uid || null;
    if (supabaseAdmin && !resolvedUid) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { name: name || "Convidada Google", nickname }
      });

      if (created?.user) {
        resolvedUid = created.user.id;
        console.log("[Google Sync] Usuária criada no Supabase Auth, UUID:", resolvedUid);
      } else if (/already|registered|exists/i.test(createErr?.message || "")) {
        // Account already exists in Auth — locate its UUID
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const match = existingUsers?.users?.find(u => (u as any).email?.toLowerCase() === normalizedEmail);
        if (match) {
          resolvedUid = match.id;
          console.log("[Google Sync] Usuária já existia no Supabase Auth, UUID:", resolvedUid);
        }
      } else if (createErr) {
        console.error("[Google Sync] Falha ao criar usuária no Supabase Auth:", createErr.message);
      }
    }
    const uidIsAuthoritative = !!resolvedUid; // came from the client or from Supabase Auth
    if (!resolvedUid) {
      resolvedUid = "usr-" + crypto.randomUUID();
    }

    // Insert or update local row keyed by email. Only overwrite an existing uid
    // when we actually resolved the authoritative Supabase Auth UUID.
    const [user] = await db.insert(usuarios).values({
      uid: resolvedUid,
      email: normalizedEmail,
      nomeCompleto: name || "Convidada Google",
      apelido: nickname,
      password: null
    }).onConflictDoUpdate({
      target: usuarios.email,
      set: {
        ...(uidIsAuthoritative ? { uid: resolvedUid } : {}),
        nomeCompleto: name || "Convidada Google",
        updatedAt: new Date()
      }
    }).returning();

    await ensureProfileAndWallet(user.id);
    res.json(await buildUserResponse(user));
  } catch (error: any) {
    console.error("[Google Sync] Failed:", error);
    res.status(500).json({ error: "Erro ao sincronizar login do Google." });
  }
});

// Ownership helper for resources looked up by their own id
async function userUidMatches(usuarioId: number, tokenUid: string): Promise<boolean> {
  const [u] = await db.select({ uid: usuarios.uid }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  return !!u && u.uid === tokenUid;
}

// 2. Profiles CRUD
app.get("/api/profiles/:uid", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.params;
    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado a este perfil." });
    }
    const userDbId = await resolveUserIdByUid(uid);
    if (!userDbId) {
      return res.status(404).json({ error: "Usuário não sintonizado no banco de dados." });
    }

    const [profile] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, userDbId)).limit(1);
    
    let parsedProfile = {};
    if (profile?.fatosBiografia) {
      try {
        parsedProfile = JSON.parse(profile.fatosBiografia);
      } catch {
        parsedProfile = {};
      }
    }

    res.json(parsedProfile);
  } catch (error) {
    console.error("[Get Profile] Failed:", error);
    res.status(500).json({ error: "Falha ao obter perfil." });
  }
});

app.post("/api/profiles/:uid", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.params;
    const profileData = req.body;

    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado a este perfil." });
    }

    const userDbId = await resolveUserIdByUid(uid);
    if (!userDbId) {
      return res.status(404).json({ error: "Usuário não sintonizado." });
    }

    // Foto de perfil enviada em base64 vira arquivo no Storage; no banco
    // fica somente a URL pública (JSON pequeno e foto permanente)
    if (typeof profileData?.avatarUrl === "string" && profileData.avatarUrl.startsWith("data:image")) {
      const uploadedUrl = await uploadDataUrlToStorage(profileData.avatarUrl, "avatars");
      if (uploadedUrl) {
        profileData.avatarUrl = uploadedUrl;
      }
    }

    // Preserva o retrato personalizado do Barão já gravado — o painel de
    // perfil não envia esse campo e não deve apagá-lo
    if (profileData && profileData.baraoAvatarUrl === undefined) {
      try {
        const [existingProf] = await db.select().from(perfisEditaveis).where(eq(perfisEditaveis.usuarioId, userDbId)).limit(1);
        if (existingProf?.fatosBiografia) {
          const existingJson = JSON.parse(existingProf.fatosBiografia);
          if (existingJson?.baraoAvatarUrl) {
            profileData.baraoAvatarUrl = existingJson.baraoAvatarUrl;
          }
        }
      } catch {}
    }

    // Store entire profile object inside fatosBiografia column as JSON
    await db.insert(perfisEditaveis).values({
      usuarioId: userDbId,
      fatosBiografia: JSON.stringify(profileData),
    }).onConflictDoUpdate({
      target: perfisEditaveis.usuarioId,
      set: {
        fatosBiografia: JSON.stringify(profileData),
        updatedAt: new Date()
      }
    });

    // Also update basic details in usuarios if provided
    if (profileData.name || profileData.nickname) {
      await db.update(usuarios).set({
        nomeCompleto: profileData.name || undefined,
        apelido: profileData.nickname || undefined,
        updatedAt: new Date()
      }).where(eq(usuarios.id, userDbId));
    }

    // Devolve o perfil normalizado (avatarUrl já como URL pública)
    res.json({ success: true, profile: profileData });
  } catch (error) {
    console.error("[Save Profile] Failed:", error);
    res.status(500).json({ error: "Falha ao salvar perfil." });
  }
});

// 3. Conversas and Chats CRUD
app.get("/api/chats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid do usuário é necessário" });
    if (!ownsUid(req, uid as string)) {
      return res.status(403).json({ error: "Acesso negado às conversas deste usuário." });
    }

    const userDbId = await resolveUserIdByUid(uid as string);
    if (!userDbId) return res.json([]);

    const userChats = await db.select().from(conversas).where(eq(conversas.usuarioId, userDbId)).orderBy(desc(conversas.updatedAt));
    res.json(userChats);
  } catch (error) {
    console.error("[Get Chats] Failed:", error);
    res.status(500).json({ error: "Erro ao carregar conversas." });
  }
});

app.post("/api/chats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, personaId, title } = req.body;
    if (!uid) return res.status(400).json({ error: "uid é necessário" });
    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const userDbId = await resolveUserIdByUid(uid);
    if (!userDbId) return res.status(404).json({ error: "Usuário não cadastrado." });

    // Seed default personas if empty to prevent foreign key issues
    await seedPersonasIfEmpty();

    // Find personaId
    let targetPersonaId = personaId;
    if (!targetPersonaId) {
      const pList = await db.select().from(personas).limit(1);
      if (pList.length > 0) {
        targetPersonaId = pList[0].id;
      } else {
        return res.status(500).json({ error: "Nenhuma persona disponível no sistema." });
      }
    }

    const [newChat] = await db.insert(conversas).values({
      usuarioId: userDbId,
      personaId: targetPersonaId,
      titulo: title || "Nossa Conversa",
      status: "ativa"
    }).returning();

    res.json(newChat);
  } catch (error) {
    console.error("[Create Chat] Failed:", error);
    res.status(500).json({ error: "Erro ao criar nova conversa." });
  }
});

app.delete("/api/chats/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id inválido" });

    const [chat] = await db.select().from(conversas).where(eq(conversas.id, id)).limit(1);
    if (!chat) return res.status(404).json({ error: "Conversa não encontrada." });
    if (req.user && !(await userUidMatches(chat.usuarioId, req.user.id))) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    await db.delete(conversas).where(eq(conversas.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("[Delete Chat] Failed:", error);
    res.status(500).json({ error: "Erro ao excluir conversa." });
  }
});

// 4. Chat Messages CRUD
app.get("/api/chats/:conversaId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const conversaId = Number(req.params.conversaId);
    if (!Number.isInteger(conversaId)) return res.status(400).json({ error: "conversaId inválido" });

    const [chat] = await db.select().from(conversas).where(eq(conversas.id, conversaId)).limit(1);
    if (!chat) return res.status(404).json({ error: "Conversa não encontrada." });
    if (req.user && !(await userUidMatches(chat.usuarioId, req.user.id))) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const msgList = await db.select().from(mensagens).where(eq(mensagens.conversaId, conversaId)).orderBy(mensagens.createdAt);
    res.json(msgList.map(m => ({
      id: m.id,
      role: m.autor === "usuario" ? "user" : "model",
      text: m.conteudoTexto,
      audioUrl: m.audioGeradoUrl,
      timestamp: m.createdAt
    })));
  } catch (error) {
    console.error("[Get Messages] Failed:", error);
    res.status(500).json({ error: "Erro ao carregar mensagens." });
  }
});

app.post("/api/chats/:conversaId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const conversaId = Number(req.params.conversaId);
    if (!Number.isInteger(conversaId)) return res.status(400).json({ error: "conversaId inválido" });
    const { role, text, audioUrl } = req.body;
    if (!text) return res.status(400).json({ error: "text é obrigatório" });

    const [chat] = await db.select().from(conversas).where(eq(conversas.id, conversaId)).limit(1);
    if (!chat) return res.status(404).json({ error: "Conversa não encontrada." });
    if (req.user && !(await userUidMatches(chat.usuarioId, req.user.id))) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const [newMsg] = await db.insert(mensagens).values({
      conversaId,
      autor: role === "user" ? "usuario" : "barao",
      conteudoTexto: text,
      audioGeradoUrl: audioUrl || null
    }).returning();

    // Update conversation updatedAt timestamp
    await db.update(conversas).set({ updatedAt: new Date() }).where(eq(conversas.id, conversaId));

    res.json(newMsg);
  } catch (error) {
    console.error("[Save Message] Failed:", error);
    res.status(500).json({ error: "Erro ao salvar mensagem no banco." });
  }
});

// 5. Diary Entries CRUD
app.get("/api/diaries", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid é obrigatório" });
    if (!ownsUid(req, uid as string)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const userDbId = await resolveUserIdByUid(uid as string);
    if (!userDbId) return res.json([]);

    const list = await db.select().from(diarioAutomatico).where(eq(diarioAutomatico.usuarioId, userDbId)).orderBy(desc(diarioAutomatico.dataResumo));
    res.json(list.map(d => ({
      id: d.id,
      date: d.dataResumo,
      title: d.tituloSintese,
      content: d.conteudoPoetico,
      mood: d.humorConsolidado
    })));
  } catch (error) {
    console.error("[Get Diaries] Failed:", error);
    res.status(500).json({ error: "Erro ao carregar diários." });
  }
});

app.post("/api/diaries", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, date, title, content, mood } = req.body;
    if (!uid || !date || !content) {
      return res.status(400).json({ error: "uid, date e content são obrigatórios" });
    }
    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const userDbId = await resolveUserIdByUid(uid);
    if (!userDbId) return res.status(404).json({ error: "Usuário não sintonizado." });

    const [newEntry] = await db.insert(diarioAutomatico).values({
      usuarioId: userDbId,
      dataResumo: date,
      tituloSintese: title || "Reflexões do Dia",
      conteudoPoetico: content,
      humorConsolidado: mood || "Acolhido"
    }).onConflictDoUpdate({
      target: [diarioAutomatico.usuarioId, diarioAutomatico.dataResumo],
      set: {
        tituloSintese: title || "Reflexões do Dia",
        conteudoPoetico: content,
        humorConsolidado: mood || "Acolhido",
        createdAt: new Date()
      }
    }).returning();

    res.json(newEntry);
  } catch (error) {
    console.error("[Save Diary] Failed:", error);
    res.status(500).json({ error: "Erro ao salvar página no diário." });
  }
});

app.delete("/api/diaries/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id inválido" });

    const [entry] = await db.select().from(diarioAutomatico).where(eq(diarioAutomatico.id, id)).limit(1);
    if (!entry) return res.status(404).json({ error: "Página não encontrada." });
    if (req.user && !(await userUidMatches(entry.usuarioId, req.user.id))) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    await db.delete(diarioAutomatico).where(eq(diarioAutomatico.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("[Delete Diary] Failed:", error);
    res.status(500).json({ error: "Erro ao excluir página." });
  }
});

// 6. Album / Histories CRUD
app.get("/api/albums", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid é obrigatório" });
    if (!ownsUid(req, uid as string)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const userDbId = await resolveUserIdByUid(uid as string);
    if (!userDbId) return res.json([]);

    const list = await db.select().from(albumEmocional).where(eq(albumEmocional.usuarioId, userDbId)).orderBy(desc(albumEmocional.createdAt));
    const mapped = await Promise.all(list.map(async a => {
      // Decode fields encoded inside descricaoMomento or cronicaPoetica if any
      let parsed: { imageUrl: string | null; prompt: string } = { imageUrl: null, prompt: "" };
      try {
        if (a.descricaoMomento && a.descricaoMomento.startsWith("{")) {
          parsed = JSON.parse(a.descricaoMomento);
        }
      } catch {}

      // Migração automática: linhas antigas guardaram a foto inteira em
      // base64 dentro do banco — isso estoura o limite de 4,5MB de resposta
      // da Vercel e derruba a sincronização inteira. Converte para arquivo
      // no Storage e regrava a linha com a URL leve.
      let imageUrl = parsed.imageUrl || null;
      if (imageUrl && imageUrl.startsWith("data:image")) {
        const hosted = await uploadDataUrlToStorage(imageUrl, "album");
        imageUrl = hosted;
        try {
          await db.update(albumEmocional).set({
            descricaoMomento: JSON.stringify({ prompt: parsed.prompt || "", imageUrl: hosted })
          }).where(eq(albumEmocional.id, a.id));
        } catch (migErr) {
          console.error("[Get Albums] Falha ao migrar imagem base64 da linha", a.id, migErr);
        }
      }

      return {
        id: a.id,
        title: a.tituloMomento,
        description: parsed.prompt || a.descricaoMomento,
        story: a.cronicaPoetica,
        imageUrl,
        createdAt: a.createdAt
      };
    }));
    res.json(mapped);
  } catch (error) {
    console.error("[Get Albums] Failed:", error);
    res.status(500).json({ error: "Erro ao carregar histórias." });
  }
});

app.post("/api/albums", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, title, description, story, imageUrl } = req.body;
    if (!uid || !title) {
      return res.status(400).json({ error: "uid e title são obrigatórios" });
    }
    if (!ownsUid(req, uid)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const userDbId = await resolveUserIdByUid(uid);
    if (!userDbId) return res.status(404).json({ error: "Usuário não sintonizado." });

    // Foto em base64 nunca entra no banco: vira arquivo no Storage e a
    // linha guarda apenas a URL (mantém a listagem leve)
    let finalImageUrl = imageUrl || null;
    if (typeof finalImageUrl === "string" && finalImageUrl.startsWith("data:image")) {
      finalImageUrl = await uploadDataUrlToStorage(finalImageUrl, "album");
    }

    // Store extra fields like image_url in a compact JSON string inside description
    const descData = JSON.stringify({ prompt: description, imageUrl: finalImageUrl });
    const safeTitle = String(title).slice(0, 155); // limite da coluna titulo_momento

    // Upsert por (usuário, título): sincronizações concorrentes atualizam a
    // mesma lembrança em vez de criar linhas duplicadas
    const [existing] = await db.select().from(albumEmocional)
      .where(and(eq(albumEmocional.usuarioId, userDbId), eq(albumEmocional.tituloMomento, safeTitle)))
      .limit(1);

    if (existing) {
      // Atualização sem imagem nova preserva a imagem já guardada na linha
      let keepImageUrl = finalImageUrl;
      if (!keepImageUrl && existing.descricaoMomento?.startsWith("{")) {
        try {
          keepImageUrl = JSON.parse(existing.descricaoMomento)?.imageUrl || null;
        } catch {}
      }

      const [updatedEntry] = await db.update(albumEmocional).set({
        descricaoMomento: JSON.stringify({ prompt: description, imageUrl: keepImageUrl }),
        cronicaPoetica: story || ""
      }).where(eq(albumEmocional.id, existing.id)).returning();
      return res.json(updatedEntry);
    }

    const [newEntry] = await db.insert(albumEmocional).values({
      usuarioId: userDbId,
      tituloMomento: safeTitle,
      descricaoMomento: descData,
      cronicaPoetica: story || ""
    }).returning();

    res.json(newEntry);
  } catch (error) {
    console.error("[Save Album] Failed:", error);
    res.status(500).json({ error: "Erro ao salvar momento no álbum." });
  }
});

app.delete("/api/albums/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "id inválido" });

    const [entry] = await db.select().from(albumEmocional).where(eq(albumEmocional.id, id)).limit(1);
    if (!entry) return res.status(404).json({ error: "Momento não encontrado." });
    if (req.user && !(await userUidMatches(entry.usuarioId, req.user.id))) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    await db.delete(albumEmocional).where(eq(albumEmocional.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("[Delete Album] Failed:", error);
    res.status(500).json({ error: "Erro ao excluir momento." });
  }
});

// Setup Vite middleware / serve static assets
async function bootstrapServer() {
  // Verify DB connectivity upfront so misconfiguration surfaces immediately
  const dbOk = await checkDbConnection();
  // Seed default personas if empty on start
  if (dbOk) {
    await seedPersonasIfEmpty();
  }
  // Global Maintenance Mode check
  app.get("*", (req, res, next) => {
    const isApiRequest = req.path.startsWith("/api");
    const isStaticAsset = req.path.includes("/assets") || req.path.includes(".") || req.path.includes("hot-update") || req.path.includes("ico");
    
    // Check for bypass in query or cookie/session. We check "?bypass=barao123" or similar
    const hasBypass = req.query.admin_bypass === "barao123" || req.query.bypass === currentAdminPassword || req.query.bypass === "barao123";

    if (isMaintenanceMode && !isApiRequest && !isStaticAsset && !hasBypass) {
      res.send(getMaintenanceHTML());
      return;
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    // Dynamic import: vite is a devDependency and must not be bundled
    // into production/serverless builds.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Meu Barão server running on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel the app runs as a serverless function (see api/index.ts):
// static files are served by Vercel itself and there is no long-lived
// listener, so skip Vite middleware / app.listen entirely.
if (!process.env.VERCEL) {
  bootstrapServer();
}

export default app;
