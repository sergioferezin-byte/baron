/**
 * Rotina de teste de ponta a ponta do Meu Barão.
 *
 * Uso:
 *   node scripts/smoke-test.mjs                      # testa a produção (Vercel)
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs   # testa local
 *
 * Não precisa de chaves: usa apenas as APIs públicas, criando um usuário
 * de teste fixo (reaproveitado entre execuções) e limpando o que criar.
 */

const BASE_URL = process.env.BASE_URL || "https://baronv2.vercel.app";
const TEST_EMAIL = "barao.smoke.test@gmail.com";
const TEST_PASSWORD = "SmokeTest#2026!";

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  return { status: res.status, json, text };
}

console.log(`\n🧪 Smoke test do Meu Barão em ${BASE_URL}\n`);

// ─── 1. Saúde ────────────────────────────────────────────────────────────────
console.log("1. Saúde do sistema");
const health = await api("/api/health");
ok("GET /api/health responde JSON", !!health.json, health.text.slice(0, 80));
ok("Banco de dados conectado", health.json?.database === "ok", health.json?.databaseError || "");
ok("Supabase Auth configurado", health.json?.supabaseAuth === "ok");
ok("GEMINI_API_KEY presente", health.json?.geminiKeyConfigured === true);

// ─── 2. Cadastro e login ─────────────────────────────────────────────────────
console.log("\n2. Cadastro e login");
let user = null;

const reg = await api("/api/auth/register", {
  method: "POST",
  body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: "Smoke Test", nickname: "Smoke" },
});
if (reg.status === 200) {
  ok("Cadastro cria usuário com sessão", !!reg.json?.session?.access_token);
  user = reg.json;
} else {
  ok("Cadastro repetido retorna 409 (e-mail já existe)", reg.status === 409, `status ${reg.status}: ${reg.text.slice(0, 100)}`);
}

const login = await api("/api/auth/login", {
  method: "POST",
  body: { email: TEST_EMAIL, password: TEST_PASSWORD },
});
ok("Login correto retorna 200 + sessão", login.status === 200 && !!login.json?.session?.access_token, `status ${login.status}`);
user = login.json || user;
const token = user?.session?.access_token;
const uid = user?.id;

const badLogin = await api("/api/auth/login", {
  method: "POST",
  body: { email: TEST_EMAIL, password: "senha-errada-123" },
});
ok("Senha errada retorna 401", badLogin.status === 401, `status ${badLogin.status}`);

const noPass = await api("/api/auth/login", { method: "POST", body: { email: TEST_EMAIL } });
ok("Login sem senha é rejeitado (400/401)", noPass.status === 400 || noPass.status === 401, `status ${noPass.status}`);

if (!token || !uid) {
  console.log("\n⛔ Sem sessão válida — abortando os testes autenticados.\n");
  report();
}

// ─── 3. Segurança das rotas de dados ─────────────────────────────────────────
console.log("\n3. Segurança (token e posse)");
const noToken = await api(`/api/diaries?uid=${uid}`);
ok("Rota de dados sem token retorna 401", noToken.status === 401, `status ${noToken.status}`);

const wrongOwner = await api(`/api/diaries?uid=uid-de-outra-pessoa`, { token });
ok("Acessar dados de outro uid retorna 403", wrongOwner.status === 403, `status ${wrongOwner.status}`);

// ─── 4. Perfil ───────────────────────────────────────────────────────────────
console.log("\n4. Perfil");
const saveProfile = await api(`/api/profiles/${uid}`, {
  method: "POST",
  token,
  body: { name: "Smoke Test", nickname: "Smoke", favoriteDrink: "chá de smoke test" },
});
ok("Salvar perfil retorna sucesso", saveProfile.status === 200 && saveProfile.json?.success === true, `status ${saveProfile.status}`);

const getProfile = await api(`/api/profiles/${uid}`, { token });
ok("Ler perfil devolve o que foi salvo", getProfile.json?.favoriteDrink === "chá de smoke test");

// ─── 5. Diário (inclui o upsert por data, que depende da unique constraint) ──
console.log("\n5. Diário");
const today = new Date().toISOString().slice(0, 10);
const diary1 = await api("/api/diaries", {
  method: "POST", token,
  body: { uid, date: today, title: "Smoke", content: "primeira versão", mood: "teste" },
});
ok("Criar página do diário", diary1.status === 200 && !!diary1.json?.id, `status ${diary1.status}: ${diary1.text.slice(0, 100)}`);

const diary2 = await api("/api/diaries", {
  method: "POST", token,
  body: { uid, date: today, title: "Smoke", content: "versão atualizada", mood: "teste" },
});
ok("Regravar mesma data atualiza (upsert/unique)", diary2.status === 200 && diary2.json?.id === diary1.json?.id, `status ${diary2.status}: ${diary2.text.slice(0, 100)}`);

const diaries = await api(`/api/diaries?uid=${uid}`, { token });
const diaryToday = Array.isArray(diaries.json) ? diaries.json.find(d => String(d.date).startsWith(today)) : null;
ok("Listar diários traz a versão atualizada", diaryToday?.content === "versão atualizada");

if (diary1.json?.id) {
  const delDiary = await api(`/api/diaries/${diary1.json.id}`, { method: "DELETE", token });
  ok("Excluir página do diário", delDiary.status === 200);
}

// ─── 6. Conversas e mensagens ────────────────────────────────────────────────
console.log("\n6. Conversas e mensagens");
const chat = await api("/api/chats", { method: "POST", token, body: { uid, title: "Smoke Chat" } });
ok("Criar conversa", chat.status === 200 && !!chat.json?.id, `status ${chat.status}: ${chat.text.slice(0, 100)}`);

if (chat.json?.id) {
  const msg = await api(`/api/chats/${chat.json.id}/messages`, {
    method: "POST", token,
    body: { role: "user", text: "mensagem de smoke test" },
  });
  ok("Salvar mensagem", msg.status === 200 && !!msg.json?.id, `status ${msg.status}`);

  const msgs = await api(`/api/chats/${chat.json.id}/messages`, { token });
  ok("Listar mensagens da conversa", Array.isArray(msgs.json) && msgs.json.some(m => m.text === "mensagem de smoke test"));

  const delChat = await api(`/api/chats/${chat.json.id}`, { method: "DELETE", token });
  ok("Excluir conversa (limpeza)", delChat.status === 200);
}

// ─── 7. Álbum ────────────────────────────────────────────────────────────────
console.log("\n7. Álbum emocional");
const album = await api("/api/albums", {
  method: "POST", token,
  body: { uid, title: "Smoke Momento", description: "registro de teste", story: "história de teste" },
});
ok("Criar momento no álbum", album.status === 200 && !!album.json?.id, `status ${album.status}: ${album.text.slice(0, 100)}`);

if (album.json?.id) {
  const albums = await api(`/api/albums?uid=${uid}`, { token });
  ok("Listar álbum", Array.isArray(albums.json) && albums.json.some(a => a.title === "Smoke Momento"));

  const delAlbum = await api(`/api/albums/${album.json.id}`, { method: "DELETE", token });
  ok("Excluir momento (limpeza)", delAlbum.status === 200);
}

report();

function report() {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`📊 Resultado: ${passed} passaram, ${failed} falharam`);
  if (failures.length) {
    console.log("\nFalhas:");
    for (const f of failures) console.log(`  • ${f}`);
  }
  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}
