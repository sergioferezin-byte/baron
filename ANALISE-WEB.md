# Análise da versão web — Meu Barão

**Data:** 19/11/2026
**O que foi analisado:** site no ar em https://baronv2.vercel.app e código em `C:\Users\eunic\barao\baron` (branch `main`, commit `2f9d697`, com o merge do PR #1). Comparação rápida com o app `C:\Users\eunic\barao\barao-app` (versão 1.6.3).
**Regras seguidas:** só análise. Nenhum código, banco, Vercel ou Supabase foi alterado. Gastos: **1 voz** (ElevenLabs) e **1 foto** (kie.ai + DeepSeek para a resposta, o prompt e a legenda).

---

## 1. Resumo

O site está no ar, carrega sem erros no console e as três mudanças publicadas hoje **funcionam**:

| Mudança | Resultado no site | Como foi testado |
|---|---|---|
| Voz só da ElevenLabs | ✅ Funciona. `/api/voice/elevenlabs` respondeu 200 em 2,8 s e o MP3 veio do bucket `barao-voz`. Voz `PxO5uAS3Vy1IJcooXHmk`, modelo `eleven_multilingual_v2` (confirmado em `/api/health`). | 1 clique em "Ouvir" na saudação do Diálogo |
| Aviso "A voz do Barão está indisponível agora" | ✅ Pelo código, aparece no lugar da voz quando a ElevenLabs falha (`BaraoChat.tsx:1402` e `:1852`). Não forcei a falha para não mexer em configuração. | Leitura de código |
| Legenda embaixo das fotos | ✅ Funciona. Pedi "Me manda uma foto sua tomando café numa varanda ao entardecer?". O Barão respondeu, gerou a foto (`/api/image/generate` em 2 s, mais cerca de 30 s até ficar pronta) e a frase *"Essa lembrança me trouxe você: um café na varanda ao entardecer, e eu aqui, querendo estar aí."* apareceu embaixo da foto, no computador e no celular. | 1 pedido real de foto |
| Limite de uso por IP | ✅ Funciona. 40 pedidos de voz passaram; do 41º em diante veio **429** com `Retry-After` e a mensagem "Muitas leituras em pouco tempo…". Trocar o cabeçalho `X-Forwarded-For` **não** burla o limite na Vercel. | 44 pedidos com texto vazio, que dão erro 400 antes de chamar a ElevenLabs e não gastam créditos |
| Login com Google na web | ✅ Começa sem erro: o Supabase manda para o Google com o Client ID novo `593670930264-m0ib…`. A tela do Google abre sem `redirect_uri_mismatch`. Não entrei com nenhuma conta. | Pedido GET ao `/auth/v1/authorize` do Supabase |

**O problema principal é segurança.** O repositório `sergioferezin-byte/baron` é **público** no GitHub. Por isso a senha de admin fixa no código (`barao123`) e as rotas sem login ficam expostas a qualquer pessoa. Vários pontos abaixo deixam alguém gastar créditos, mudar o comportamento do Barão para todas as usuárias ou ver dados de diagnóstico.

---

## 2. Problemas por prioridade

### 🔴 Críticos

**C1. Senha de admin fixa e pública: `barao123`**
- **Onde:** `server.ts:86`, `:3142`, `:3162`, `:4316`; `src/components/BaraoAdminDashboard.tsx:1155` (o próprio painel mostra `?bypass=barao123`).
- **O que acontece:** `/api/admin/verify-password` e `POST /api/admin/config` aceitam `barao123` **mesmo quando `ADMIN_PASSWORD` está configurada**. Como o repositório é público, qualquer pessoa pode trocar o *system prompt* do Barão (o que ele diz para todas as usuárias), ligar o modo manutenção ou mudar os planos. O painel ainda guarda a senha em texto puro no `localStorage` (`mb_admin_password_cache`).
- **Sugestão:** remover todos os `|| "barao123"` e `=== "barao123"`. Exigir `ADMIN_PASSWORD` (sem ela, a rota não funciona). Melhor ainda: proteger o admin com o login do Supabase e uma lista de e-mails de administradores. Trocar a senha na Vercel depois de corrigir. Não guardar a senha no navegador.

**C2. Rotas que gastam IA sem login e sem limite**
- **Onde:** `server.ts` — `/api/chat` (1566), `/api/diary/generate` (1790), `/api/story/generate` (1884), `/api/song/compose` (1925), `/api/meditation/initiate` (2076), `/api/meditation/chat` (2160), `/api/chat/media/diag` (1510).
- **O que acontece:** todas chamam DeepSeek ou Gemini sem exigir conta e **sem** o `limiteDeUso` (que hoje só cobre `/api/voice`, `/api/image/generate`, `/api/barao/generate-avatar` e `/api/music/generate`). Um script consegue esvaziar o saldo da DeepSeek ou da Gemini. Os limites de plano (`maxDailyMessages`: 15 no grátis) **não são aplicados em lugar nenhum** do servidor.
- **Sugestão:** aplicar o mesmo `limiteDeUso` nessas rotas (por exemplo, 30 mensagens a cada 10 min por IP no `/api/chat` e menos nas outras). Fechar `/api/chat/media/diag` (ver C4). Mais adiante, contar o uso por conta no banco (a tabela `carteiras_creditos` já existe, então não precisa mudar a estrutura).

**C3. Upload público para o Storage (hospedagem gratuita de arquivos para estranhos)**
- **Onde:** `server.ts:1425` (`/api/chat/media`) e `:1455` (`/api/chat/media/sign`).
- **O que acontece:** sem login, qualquer pessoa sobe fotos de até 4,5 MB ou pede URLs assinadas para subir **vídeos de até 25 MB** no bucket público `barao-imagens`. Isso pode encher o Storage (e a conta) e servir para hospedar conteúdo impróprio com o domínio do Supabase do projeto.
- **Sugestão:** colocar limite por IP nas duas rotas já. Se o chat de visitante precisar de mídia, manter um limite baixo. Senão, exigir `requireAuth`. Avaliar uma limpeza automática da pasta `chat/` depois de alguns dias.

**C4. `/api/chat/media/diag` busca qualquer URL a partir do servidor (SSRF)**
- **Onde:** `server.ts:1520-1531`.
- **O que acontece:** a rota faz `fetch(url)` com a URL enviada pela pessoa **antes** de checar se ela é do Supabase (`isSupabaseMediaUrl` só preenche o campo `urlAllowed`) e devolve status, tipo e tamanho. Com `descrever: true`, também chama a Gemini. A rota é pública.
- **Sugestão:** remover a rota em produção ou exigir admin. Se ficar, só buscar quando `isSupabaseMediaUrl(url)` for verdadeiro.

**C5. Diagnóstico interno à mostra para visitantes**
- **Onde:** tela **Evolução** (componente `SupabaseAdmin` dentro de `BaraoEvolucao.tsx:7`); rotas `GET /api/auth/test-supabase` (`server.ts:3430`), `GET /api/admin/config` (`:3149`) e `GET /api/health` (`:3409`).
- **O que acontece (visto no site):** qualquer visitante vê em Evolução o bloco "DIAGNÓSTICO DO SERVIDOR (SUPABASE SYNC)", com o começo das chaves, o tamanho da *service role key* e "Found 9 users in Supabase Auth". `/api/admin/config` devolve o *system prompt* completo do Barão (o "segredo" do produto). `/api/health` mostra o host do banco e quais chaves existem.
- **Sugestão:** tirar o `SupabaseAdmin` da tela Evolução. Apagar `/api/auth/test-supabase`. Exigir admin no `GET /api/admin/config`. Deixar `/api/health` só com `{ok:true}` em público.

### 🟠 Importantes

**I1. Rotas que aceitam o `uid` de outra pessoa sem conferir o login**
- **Onde:** `/api/barao/generate-avatar` (`server.ts:3013`, sem `requireAuth`, grava o retrato no perfil do `uid` recebido) e `/api/image/generate` (`:2771`, lê a foto de perfil do `uid` recebido e usa como referência).
- **O que acontece:** quem souber o UUID de uma usuária consegue trocar o retrato do Barão dela ou gerar imagens com o rosto dela. Os UUIDs não são fáceis de adivinhar, por isso não está como crítico, mas é uma falha de autorização.
- **Sugestão:** só usar o `uid` quando vier do token (`requireAuth` opcional + `ownsUid`). Sem login, ignorar o `uid`.

**I2. Plano e tokens são decididos pelo navegador**
- **Onde:** `BaraoEvolucao.tsx:25-85` (os botões "Mudar para Premium/Elite" só mudam o `localStorage`); `POST /api/profiles/:uid` (`server.ts:3839`) aceita qualquer campo no JSON, incluindo `plan`; `POST /api/auth/register` aceita `plan` no corpo.
- **O que acontece:** a página diz "caráter demonstrativo… simulação". Qualquer pessoa vira Elite com um clique, e hoje o plano não libera nada no servidor. Antes de cobrar de verdade, isso precisa mudar.
- **Sugestão:** o servidor deve ignorar `plan` vindo do cliente (tirar do `register` e filtrar no `profiles`). O plano deve vir só de uma confirmação de pagamento. Até existir pagamento, esconder os botões de upgrade ou deixar claro que é uma prévia.

**I3. Preços e textos dos planos não batem**
- **Onde:** Evolução mostra **R$ 29,90 / R$ 69,90**; `server.ts:104` e `:114` (painel admin) dizem **R$ 49,90 / R$ 99,90**. Evolução (`BaraoEvolucao.tsx:353`) e Paywall (`BaraoPaywall.tsx:122`) prometem "Gemini 1.5 Pro", mas o chat usa DeepSeek.
- **Sugestão:** definir um único preço e ler de um só lugar. Tirar a menção ao "Gemini 1.5 Pro".

**I4. Política de Privacidade não cita os fornecedores reais (LGPD)**
- **Onde:** `PrivacyPolicyPage.tsx:175` e `:198`.
- **O que acontece:** o texto fala em "Google Cloud Run" e "ecossistema Gemini". O site usa **Vercel, Supabase (banco nos EUA, `us-west-2`), DeepSeek, ElevenLabs, kie.ai (Suno e geração de imagens) e Azure**. Desabafos com dados sensíveis vão para a DeepSeek, então a transferência internacional precisa ser informada. Não há data exata (só "Maio de 2026") nem nome do encarregado (DPO). Só aparece `sac@meubarao.com`.
- **Sugestão:** listar os operadores reais e seus países, informar a transferência internacional e citar o encarregado. Atualizar a data. Vale passar por uma pessoa da área jurídica.

**I5. Na web não dá para apagar a conta**
- **Onde:** a rota `DELETE /api/auth/conta` existe (`server.ts:3591`) e o app usa, mas a web não tem esse botão (`grep auth/conta src` → 0).
- **O que acontece:** a política promete "Exclusão Absoluta" (LGPD, direito do titular), e só o app oferece isso.
- **Sugestão:** colocar "Apagar minha conta" no painel de perfil da web, com confirmação.

**I6. Meditação, recitação de letras e prévias ainda usam a voz robótica do navegador**
- **Onde:** `AudioTherapy.tsx:373`, `:397`, `:655`, `:931` (`synther.speakText` → `speechSynthesis`).
- **O que acontece:** a regra "voz só da ElevenLabs" vale para o Diálogo, mas Meu Refúgio > Meditação e o Ateliê (recitar letra e comentário do Barão) ainda falam com a voz do sistema.
- **Sugestão:** trocar por `requestBaraoVoiceUrl` + `synther.playAudioUrl` e mostrar `BARAO_VOICE_UNAVAILABLE` em caso de falha. Como meditações são textos longos, guardar o áudio gerado para não pagar duas vezes.

**I7. Modo manutenção e painel admin não funcionam na Vercel**
- **Onde:** `server.ts:4310` (a verificação de manutenção só roda em `bootstrapServer()`, que é pulado na Vercel em `:4351`) e `:138` (`admin_configs.json` é gravado em disco, que é somente leitura na Vercel).
- **O que acontece:** ligar a manutenção não bloqueia o site. Mudanças de prompt ou planos ficam só na memória de uma instância e somem no próximo *cold start*. O painel parece funcionar, mas não funciona.
- **Sugestão:** guardar essas configurações numa tabela que já exista ou no Storage do Supabase (sem mudar a estrutura, um JSON no bucket serve). Verificar a manutenção no próprio front (o front já busca `/api/admin/config`).

**I8. Metadados e título errados (SEO e compartilhamento)**
- **Onde:** `index.html`.
- **O que acontece (visto no site):** a aba se chama **"My Google AI Studio App"**, `lang="en"`, sem `meta description`, sem Open Graph (o link no WhatsApp ou Instagram sai sem imagem nem texto), sem favicon (`/favicon.ico` devolve o HTML), e `robots.txt` também devolve o HTML.
- **Sugestão:** `<html lang="pt-BR">`, `<title>Meu Barão — Inteligência Emocional</title>`, `meta description`, `og:title`/`og:description`/`og:image` (uma versão leve do retrato), `theme-color`, favicon e `apple-touch-icon` (dá para reaproveitar o ícone do app), `robots.txt` e `sitemap.xml` simples.

**I9. Script do AI Studio no `index.html` esconde erros**
- **Onde:** `index.html:7-94`.
- **O que acontece:** troca o `WebSocket` do navegador e engole qualquer erro cuja mensagem contenha "WebSocket". Isso é sobra do AI Studio. Pode esconder falhas reais (por exemplo, do Supabase Realtime) e quebrar conexões a `localhost`.
- **Sugestão:** apagar o bloco inteiro.

**I10. Desempenho: bundle único de 1 MB e imagem de 1,6 MB**
- **Onde:** build (`dist/assets/index-*.js` com 822 KB; no ar 1.014 KB descompactado / 275 KB transferidos); `src/assets/images/barao_portrait_1779931788412.png` com **1,6 MB**, usado como fundo de todas as telas e como avatar de 31 px no chat. Há uma cópia idêntica em `public/barao-retrato.png`.
- **O que acontece:** no 4G a primeira tela demora. Não há divisão de código (nenhum `React.lazy`), então Admin, Ateliê, Diário, Termos etc. carregam junto com a home.
- **Sugestão:** converter o retrato para WebP/AVIF (~150 KB) e fazer uma versão de 64 px para o avatar. Usar `React.lazy` nas abas (`AudioTherapy`, `UserProfilePanel`, `BaraoAdminDashboard`, `BaraoHistory`, páginas legais). Apagar a cópia em `public/`.

### 🟡 Melhorias

| # | Onde | O que acontece | Sugestão |
|---|---|---|---|
| M1 | `App.tsx` (abas) | Todas as telas ficam em `/`: não dá para mandar um link direto para o Diálogo ou a Evolução, e o botão Voltar do celular sai do site. Só `/privacy`, `/terms` e `/admin` têm endereço. | Usar `/dialogo`, `/refugio`, `/universo`, `/meu-barao`, `/evolucao` com `pushState` (o mesmo padrão já usado no admin). |
| M2 | Diálogo, computador | A última mensagem da usuária fica escondida atrás da barra "Som de fundo" no topo do chat quando a conversa rola. | Dar `padding-top` à lista ou fazer a barra ocupar espaço próprio. |
| M3 | Diálogo, computador | A foto gerada (4:3) aparece com uma faixa preta à direita dentro do quadro. | Ajustar a largura do quadro à imagem (`w-fit`) ou usar `object-cover`. |
| M4 | `BaraoAuth.tsx` | Não existe "Esqueci minha senha". | `supabase.auth.resetPasswordForEmail` + tela de nova senha. |
| M5 | Textos | Home: "Ter as respostas que **só quem que** te conhece…" e "em sua bolsa...." (4 pontos). Meu Barão (`MeuBarao.tsx:142`): "**descançar**" → "descansar". "Doações de cura" no bloco do WhatsApp soa estranho. | Revisar o texto. |
| M6 | Meu Barão › WhatsApp | O bloco "Conexão ao Canal WhatsApp" só grava o número no navegador. Não existe envio de mensagens. Promete algo que não acontece. | Esconder até existir a integração ou marcar como "em breve". |
| M7 | Persistência | 128 usos de `localStorage` no front: WhatsApp, plano, arquétipo e partes do Universo não acompanham a usuária entre aparelhos. | Aos poucos, mover o que importa para `fatosBiografia` (já existe, sem mudar o banco). |
| M8 | Acessibilidade | Links de rodapé com 16 px de altura e o botão "Som de fundo" com 47×31 px no celular (o mínimo recomendado é 44×44). Texto dourado bem pequeno (8–9 px em `font-mono`) em vários rótulos. O fundo com foto prejudica o contraste em alguns trechos. Os botões têm `aria-label` (bom) e as imagens têm `alt` (bom). | Aumentar as áreas de toque e os rótulos menores para pelo menos 11–12 px. |
| M9 | `server.ts:50` | `express.json({ limit: "15mb" })`, mas a Vercel corta em 4,5 MB, então fotos grandes dão um erro genérico. | Baixar para 4 MB e mostrar uma mensagem clara. |
| M10 | `server.ts:11-19` | O log de inicialização imprime o começo das chaves (`substring(0,10)`). | Logar só "definida: sim/não". |
| M11 | `/api/voice/elevenlabs` (`server.ts:2378`) | Aceita `voice` vindo do cliente: alguém pode gerar áudio com outra voz da conta usando os créditos do projeto. | Ignorar `voice` do corpo em produção. |
| M12 | Rotas antigas | `/api/voice/speak`, `/api/voice/azure` e `/api/voice/fallback` continuam no ar e públicas, mas não são mais usadas. | Remover, ou deixar só para admin. |
| M13 | Storage | Cada "Ouvir" gera um MP3 novo e permanente em `barao-voz` (para visitantes também). | Limpeza periódica dos áudios de visitante, ou cache por hash do texto. |
| M14 | `README.md`, `metadata.json`, `.env.example` | O README é o do AI Studio ("Run and deploy your AI Studio app"). O `.env.example` ainda descreve "ElevenLabs > Azure > Gemini > navegador". | Atualizar a documentação. |
| M15 | Saúde mental | O CVV 188 aparece só nos Termos. | Se o Barão detectar risco (o prompt já trata disso em `server.ts:1037`), mostrar um cartão fixo com o CVV 188 no chat, além da resposta dele. |

**O que está bem:** nenhum segredo commitado (varredura de `sk-`, JWT, `AIza`, URLs do Postgres com senha); `tsc --noEmit` sem erros; nenhum erro no console durante a navegação; as rotas de dados (`/api/chats`, `/api/diaries`, `/api/albums`, `/api/songs`, `/api/profiles`) exigem token e conferem o dono; senha local com scrypt; a API não responde CORS para outros sites (o preflight de outra origem não recebe `Access-Control-Allow-Origin`); HSTS ativo; o login social do app valida assinatura, emissor e público do token; o layout no celular (390 px) não tem rolagem horizontal, o menu abre bem e o campo do chat tem fonte de 16 px (não dá zoom no iPhone).

---

## 3. Comparação web × app (`barao-app` 1.6.3)

Os dois usam o mesmo servidor (`baronv2.vercel.app`).

| Função | Web | App |
|---|---|---|
| Chat com o Barão (texto) | ✅ | ✅ |
| Voz do Barão (ElevenLabs) + aviso de indisponível | ✅ | ✅ |
| Falar por voz / "ligação" com o Barão | ✅ (modo fone) | ✅ (plugin de reconhecimento de voz) |
| Enviar foto/vídeo no chat; foto do Barão com legenda | ✅ | ✅ |
| Login e-mail/senha | ✅ | ✅ |
| Login Google | ✅ (OAuth do Supabase) | ✅ (token nativo → `/api/auth/google`) |
| Login Apple | ❌ | ✅ |
| **Apagar conta** | ❌ | ✅ (`DELETE /api/auth/conta`) |
| Renovar sessão sem pedir senha | ✅ (o cliente Supabase renova sozinho) | ✅ (`/api/auth/refresh`) |
| Enviar mensagens em lote (offline → online) | ❌ | ✅ (`/messages/lote`) |
| Respiro guiado 4-4-6 (funciona offline) | ❌ | ✅ (`telas/Respiro.tsx`) |
| Apagar conversa ou dados só do aparelho | parcial ("Reiniciar diálogo") | ✅ (Ajustes) |
| Modo incógnito no chat | ✅ | ❌ |
| Diário automático | ✅ | ❌ |
| Meditação guiada | ✅ (voz do navegador, ver I6) | ❌ |
| Ateliê de composição (Suno) | ✅ | ❌ |
| Studio/álbum de lembranças | ✅ | ❌ |
| Meu Universo (perfil afetivo) | ✅ | ❌ |
| Meu Barão (arquétipo, retrato próprio ou por IA) | ✅ | ❌ |
| Planos/tokens (simulado) e paywall | ✅ | ❌ |
| Som de fundo (mixer ambiente) | ✅ | ❌ |
| Painel admin | ✅ (inseguro, ver C1) | ❌ |

**Leitura:** o app é a versão "enxuta e segura" (chat, voz, mídia, conta). A web tem muito mais recursos, mas é ela que expõe o servidor. Para manter os dois iguais, o mais urgente é levar **apagar conta** para a web (I5). Trazer o **Respiro** do app para a web é fácil e útil.

---

## 4. Ordem sugerida de correção

1. **Hoje:** C1 (remover `barao123` e trocar a senha) e C5 (esconder diagnóstico e prompt). São mudanças pequenas.
2. **Esta semana:** C2 e C3 (limites nas rotas de IA e de upload), C4 (fechar o diag), I1 (uid só pelo token).
3. **Antes de divulgar:** I8 (título, OG, favicon), I9 (tirar o script do AI Studio), I10 (imagem e bundle), I4 (privacidade), I5 (apagar conta).
4. **Antes de cobrar:** I2 e I3 (plano decidido pelo servidor, preços únicos).
5. **Depois:** I6, I7 e as melhorias M1–M15.

Nenhuma dessas correções exige mudar a estrutura do banco.

---

## 5. Banco de dados (Supabase `tzybwgiviuotvbknugsc`)

**O site e o app já usam o mesmo banco.** O app chama o servidor `baronv2.vercel.app`, e esse servidor fala com o Postgres do Supabase `tzybwgiviuotvbknugsc` (pooler `aws-1-us-west-2`). Não há migração a fazer: é um banco só.

Verificação feita por fora, só contando linhas e sem ler dados pessoais, com a chave pública que está no site:

| Item | Situação |
|---|---|
| As 15 tabelas do `src/db/schema.ts` existem | ✅ todas respondem |
| RLS (proteção contra leitura direta com a chave pública) | ✅ ativa: a chave pública vê 0 linhas em todas, inclusive em `personas`, que tem dados. O servidor usa a *service role* e não é afetado. |
| Tabela de planos ou de configuração | Não existe. Por isso planos, Mercado Pago e chaves de IA ficam num JSON cifrado no Storage (bucket privado `barao-config`), **sem mudar o banco**. |

Pontos de atenção (nenhum quebra nada hoje):
- **Sem índices nas chaves estrangeiras** (`mensagens.conversa_id`, `conversas.usuario_id` etc.). Com poucos usuários não faz diferença; com milhares de mensagens, o histórico fica lento. O SQL pronto está em [drizzle/sugestao-indices.sql](drizzle/sugestao-indices.sql). Ele **não foi aplicado**, só cria índices e pode rodar no SQL Editor quando quiser.
- **A migração `0002_composicoes_musicais` não está no `_journal.json`.** Ela foi aplicada à mão (a tabela existe), mas `drizzle-kit migrate` não a conhece. Não rode `drizzle-kit push`/`migrate` contra este banco sem conferir antes.
- **Tabelas criadas e nunca usadas pelo servidor:** `imagens_geradas`, `memorias_persistentes` (pgvector), `perfis_emocionais`, `historico_emocional`, `access_logs`. Não atrapalham e ficam para uma "memória de longo prazo" futura.
- **Valores padrão desencontrados:** `carteiras_creditos.tokens_disponiveis` tem padrão 50000 no esquema, mas o código cria com 100. `assinaturas.plano_atual` tem padrão "gratuito". Agora o código grava sempre o id do plano do painel ("free", "premium"...).
- **O RLS foi ligado pelo painel do Supabase, não pelas migrações.** Se o banco for recriado a partir das migrações, o RLS precisa ser ligado de novo.

Como o plano passou a ser guardado (sem coluna nova): tabela `assinaturas` → `plano_atual` = id do plano, `status` = `ativa`/`cancelada`/`substituida`, `data_fim` = vencimento, `stripe_subscription_id` = `mp:<id do pagamento>` (Mercado Pago) ou `manual:<data>` (concedido no painel).

---

## 6. O que foi feito depois desta análise (branch `feat/admin-seguranca-pagamentos`)

**C1 corrigido:** não existe mais senha fixa. Entra no `/admin` quem fizer login com um e-mail listado em `ADMIN_EMAILS`, ou quem souber a `ADMIN_PASSWORD` (12+ caracteres, só pela variável de ambiente). `barao123` é recusada. O painel não guarda mais a senha no `localStorage`. O "bypass" de manutenção pela URL foi removido.

**C5 corrigido:** o diagnóstico do Supabase saiu da tela Evolução. A rota `/api/auth/test-supabase` foi apagada. `/api/admin/config` exige admin. `/api/health` público responde só `{ok}`, e o detalhe dos serviços foi para `/api/admin/saude`. `/api/chat/media/diag` exige admin. O log de inicialização não mostra mais o começo das chaves.

**Também corrigido:** I1 (o `uid` vem do token nas rotas de foto e retrato), I2/I3 (plano decidido pelo servidor e preços num lugar só), I7 (manutenção e configurações funcionam na Vercel), M1 (cada aba tem endereço próprio), limites por IP também no chat, nos textos de IA e nos uploads (ajustáveis no painel).

**Área admin nova (`/admin`):**
- **Resumo:** usuárias, novas na semana, assinaturas ativas, conversas, mensagens, canções e saúde dos serviços.
- **Usuárias:** busca, plano atual, créditos, conceder ou cancelar plano por X dias.
- **Planos:** criar, editar e apagar (o grátis não pode ser apagado). Preço, duração, créditos, mensagens por dia, nível de acesso, benefícios, destaque e visibilidade. A tela Evolução lê daqui.
- **Mercado Pago:** modo teste/produção, Public Key, Access Token e chave secreta do webhook (cifrados), nome na fatura, ligar/desligar, testar conexão e URL do webhook para copiar.
- **Serviços de IA:** trocar as chaves de DeepSeek, Gemini, ElevenLabs, kie.ai e Azure sem novo deploy, testar cada uma (mostra saldo quando o serviço informa) e ajustar modelos e o ID da voz.
- **Geral:** modo manutenção com mensagem, limites por pessoa, contato de suporte e a personalidade do Barão (prompt), com botão para restaurar o original.
- **Assinaturas:** as últimas 100, com a origem (Mercado Pago ou painel).

**Pagamento:** a tela Evolução abre o Checkout Pro do Mercado Pago (Pix, cartão, boleto). O webhook **confere o pagamento na API do Mercado Pago** (status aprovado e valor certo) antes de ativar o plano, e confere a assinatura `x-signature` quando a chave secreta está cadastrada. A cobrança é **avulsa por período**, não recorrente: no fim do período a pessoa paga de novo.

**Foto e música juntas (Ateliê):** botão "Foto do Barão" em cada canção e a opção "Gravar com foto". Enquanto o Suno grava, o Barão revela uma foto dele no clima da canção. A foto vira a capa, e o player mostra a foto grande com título, a frase do Barão e o áudio embaixo. A capa fica salva no banco (`composicoes_musicais.capa_url`).

### Para ligar em produção
1. Na Vercel do projeto que serve o site: `ADMIN_EMAILS` (seu e-mail), `CONFIG_SECRET` (texto aleatório longo) e `APP_URL` (endereço do site).
2. Publicar este código.
3. Entrar em `/admin` › Mercado Pago, colar as credenciais **de teste**, cadastrar o webhook no painel do Mercado Pago, ligar os pagamentos e fazer uma compra de teste.
4. Trocar para as credenciais de produção.
5. (Opcional) Rodar [drizzle/sugestao-indices.sql](drizzle/sugestao-indices.sql) no SQL Editor do Supabase.
