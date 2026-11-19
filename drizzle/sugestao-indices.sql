-- Índices recomendados (NÃO aplicados automaticamente).
--
-- Não mudam a estrutura das tabelas nem os dados: só deixam as buscas por
-- usuária e por conversa mais rápidas quando o número de mensagens crescer.
-- O app e o site usam o mesmo banco, e os dois se beneficiam.
--
-- Como aplicar: Supabase > SQL Editor > colar e rodar. Pode rodar mais de uma
-- vez sem problema (IF NOT EXISTS). CONCURRENTLY evita travar as tabelas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS mensagens_conversa_idx
  ON mensagens (conversa_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS conversas_usuario_idx
  ON conversas (usuario_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS album_emocional_usuario_idx
  ON album_emocional (usuario_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS imagens_geradas_album_idx
  ON imagens_geradas (album_id);

-- Plano atual: o servidor busca a assinatura ativa de cada usuária
CREATE INDEX CONCURRENTLY IF NOT EXISTS assinaturas_usuario_status_idx
  ON assinaturas (usuario_id, status, data_inicio DESC);
