# Meu Barão (web + servidor)

Companheiro de escuta emocional com IA, em português. Este repositório tem o
site (React + Vite) e o servidor (Express) que também atende o app
`barao-app` (Capacitor). Banco: Postgres do Supabase.

## Rodar na máquina

```bash
npm install
cp .env.example .env   # preencha as chaves
npm run dev            # http://localhost:3000
```

## Publicar

A Vercel usa o `vercel.json`: o front vai para `dist/` e o servidor é
empacotado em `dist-server/app.mjs` e servido por `api/index.js`.

Variáveis obrigatórias da área admin: `ADMIN_EMAILS` (ou `ADMIN_PASSWORD`
com 12+ caracteres), `CONFIG_SECRET` e `APP_URL`. Veja `.env.example`.

## Área admin

Em `/admin`: planos, Mercado Pago, chaves dos serviços de IA, usuárias,
assinaturas, limites de uso, manutenção e personalidade do Barão. As
configurações ficam cifradas no bucket privado `barao-config` do Supabase
Storage, sem mudar o banco.

Análise completa e próximos passos: [ANALISE-WEB.md](ANALISE-WEB.md).
