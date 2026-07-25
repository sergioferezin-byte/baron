-- Ateliê de Composição: canções escritas pelo Barão e gravadas via Suno.
-- Aplicar colando no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS composicoes_musicais (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo varchar(155) NOT NULL,
  genero varchar(80),
  estilo_tags text,
  letra text NOT NULL,
  tempo varchar(40),
  instrumentacao text[],
  comentario_barao text,
  audio_url text,
  capa_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT composicoes_musicais_usuario_titulo_unique UNIQUE (usuario_id, titulo)
);

CREATE INDEX IF NOT EXISTS composicoes_musicais_usuario_idx
  ON composicoes_musicais (usuario_id, created_at DESC);
