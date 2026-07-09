# Modelo de Banco de Dados — "Meu Barão"
Este documento apresenta a modelagem de banco de dados profissional, escalável e de nível corporativo para o aplicativo **Meu Barão**.

A arquitetura foi desenhada para suportar milhões de mensagens, busca semântica em tempo real via vetores (`pgvector`), compressão de memória afetiva, otimização extrema de custo operacional de LLMs e separação clara de domínios de dados.

---

## 🗺️ Visão Geral da Arquitetura
O banco de dados é modelado utilizando o **PostgreSQL 16+** como motor principal, devido ao seu ecossistema robusto para dados relacionais clássicos, suporte avançado a extensões de vetores (`pgvector`), capacidades de indexação espacial/semântica, e suporte a particionamento nativo de tabelas de alta volumetria.

### Separação de Domínios de Dados
Para garantir a máxima performance, baixa latência física e facilidade de backup seletivo, o banco é estruturado em cinco domínios fundamentais:
1. **Dados Permanentes (Core):** Cadastros, perfis estáticos e controle financeiro de assinaturas.
2. **Dados Relacionais (Interações):** Personas, conversas e mensagens tradicionais de chat.
3. **Dados Emocionais (Subjetivos):** Álbuns compartilhados, diários consolidados e sentimentos.
4. **Dados Inferidos pela IA (Memória Semântica):** Memórias de longo prazo vetoriais, perfis psicológicos de usuário derivados e gatilhos emocionais.
5. **Dados Temporários e Telemetria (Observabilidade):** Logs transacionais, métricas de consumo de tokens e analytics comportamental.

---

## 🗄️ Modelagem das Tabelas (SQL DDL)

### 1. Dados Permanentes e Relacionais Core

#### Tabela: `usuarios`
Contém o registro de identidade e as informações básicas da usuária.
```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome_completo VARCHAR(150) NOT NULL,
    apelido VARCHAR(50) NOT NULL,
    data_nascimento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
```

#### Tabela: `perfis_editaveis`
Configurações explícitas de preferência informadas diretamente pela usuária nas telas de ajuste.
```sql
CREATE TABLE perfis_editaveis (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    idioma_preferido VARCHAR(10) DEFAULT 'pt-BR',
    fatos_biografia TEXT, -- Fatos importantes que a usuária digitou sobre si
    genero_afetor VARCHAR(20) DEFAULT 'fem',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    preferred_voice_id VARCHAR(50) DEFAULT 'barao_standard_v1',
    avatar_model_style VARCHAR(30) DEFAULT 'classic_cinematic',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `assinaturas`
Estrutura para gerenciar planos de cobrança e gateways de pagamento (ex: Stripe).
```sql
CREATE TYPE tipo_plano AS ENUM ('gratuito', 'conforto', 'sintonia_total');
CREATE TYPE status_assinatura AS ENUM ('ativa', 'cancelada', 'inadimplente', 'trialing');

CREATE TABLE assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_atual tipo_plano DEFAULT 'gratuito',
    status status_assinatura DEFAULT 'gratuito',
    stripe_subscription_id VARCHAR(100) UNIQUE,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assinaturas_usuario ON assinaturas(usuario_id);
```

#### Tabela: `carteiras_creditos`
Controle rígido do balanço de tokens e moedas internas para uso dos canais de IA generativa.
```sql
CREATE TABLE carteiras_creditos (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    tokens_disponiveis BIGINT DEFAULT 50000, -- Limite grátis padrão
    tokens_consumidos_total BIGINT DEFAULT 0,
    ultima_recarga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Relacionais e Interações (Preparado para Volumetria de Milhões de Mensagens)

#### Tabela: `personas`
Registra as configurações do sistema para o Barão ou variações de personalidades que possam ser selecionadas.
```sql
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    arquetipo VARCHAR(100) NOT NULL,
    prompt_sistema TEXT NOT NULL,
    config_voz_url VARCHAR(255),
    config_avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `conversas`
Estrutura que agrupa as sessões de diálogo sequencial.
```sql
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES personas(id),
    titulo VARCHAR(150) DEFAULT 'Nossa Conversa',
    status VARCHAR(20) DEFAULT 'ativa', -- 'ativa', 'arquivada', 'concluida'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversas_usuario_persona ON conversas(usuario_id, persona_id);
```

#### Tabela Particionada: `mensagens`
Tabela estruturada com **Particionamento por Faixa de Tempo (Range Partitioning)** baseada no mês em que a mensagem foi escrita. Isso garante que buscas por histórico recente sejam extremamente rápidas e permite descartar ou mover partições antigas congeladas em cold storage para economizar centenas de gigabytes.
```sql
CREATE TABLE mensagens (
    id UUID NOT NULL,
    conversa_id UUID NOT NULL,
    autor VARCHAR(20) NOT NULL CHECK (autor IN ('usuario', 'barao')),
    conteudo_texto TEXT NOT NULL,
    tokens_contabilizados INT DEFAULT 0,
    audio_gerado_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at) -- Inclui chave de partição na restrição única
) PARTITION BY RANGE (created_at);

-- ÍNDICES LOCAIS DENTRO DAS PARTIÇÕES (Criados dinamicamente em cada partição)
-- Criação de partições de exemplo:
-- CREATE TABLE mensagens_2026_m05 PARTITION OF mensagens FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- CREATE TABLE mensagens_2026_m06 PARTITION OF mensagens FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

---

### 3. Dados Emocionais (Subjetivos e Afetivos)

#### Tabela: `album_emocional`
Armazena os registros do álbum "Nossa História" onde a usuária e o Barão compartilham fotos físicas ou momentos sensoriais significativos.
```sql
CREATE TABLE album_emocional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo_momento VARCHAR(155) NOT NULL,
    descricao_momento TEXT,
    cronica_poetica TEXT, -- A narrativa afetiva escrita pelo Barão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_album_emocional_usuario ON album_emocional(usuario_id);
```

#### Tabela: `imagens_geradas`
Fotos compostas geradas pelas ferramentas de IA (ou canais de mixagem de canvas) associadas aos momentos.
```sql
CREATE TABLE imagens_geradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES album_emocional(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- Endpoint ou link do Cloud Storage público/protegido
    prompt_confeccionado TEXT NOT NULL, -- Prompt final unificado passado ao Imagen
    modelo_utilizado VARCHAR(50) DEFAULT 'imagen-4.0-generate-001',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `diario_automatico`
Gerações de reflexão que consolidam os sentimentos do dia. Criadas em background por cronjobs alimentados por resumos de diálogos mais profundos.
```sql
CREATE TABLE diario_automatico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_resumo DATE NOT NULL,
    titulo_sintese VARCHAR(150),
    conteudo_poetico TEXT NOT NULL,
    humor_consolidado VARCHAR(50), -- Esperança, Saudade, Melancolia, Alegria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_diario_data_usuario ON diario_automatico(usuario_id, data_resumo);
```

---

### 4. Dados Inferidos pela IA (Memória Semântica e Perfil de Aprendizado)

#### Tabela: `perfis_emocionais`
Tabela dinâmica enriquecida incrementalmente pela IA com base nas interações da usuária. Utiliza o tipo `JSONB` do PostgreSQL para permitir propriedades mutáveis sem necessidade de alteração na estrutura de colunas (schema migration).
```sql
CREATE TABLE perfis_emocionais (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    estado_espirito_corrente VARCHAR(100),
    linguagem_amor_predileta VARCHAR(50),
    gatilhos_ansiedade TEXT[], -- Gatilhos explícitos desvendados pelas conversas
    insights_ia JSONB DEFAULT '{}'::jsonb, -- Dicionário de comportamentos e traços
    escore_empatia NUMERIC(3,2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: `historico_emocional`
Série temporal de análise de sentimento que serve para gerar gráficos e relatórios de analytics sobre a jornada terapêutica/afetiva da usuária.
```sql
CREATE TABLE historico_emocional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    conversa_id UUID NOT NULL,
    escore_valencia NUMERIC(3,2) NOT NULL, -- +1.0 (Extremamente feliz) a -1.0 (Tristeza)
    escore_excitacao NUMERIC(3,2) NOT NULL, -- Nível de energia (Agitado vs Calmo)
    humor_detectado VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historico_emocional_tendencia ON historico_emocional(usuario_id, created_at DESC);
```

#### Tabela: `memorias_persistentes` (Buscador Semântico com PGVector)
Esta é uma das tabelas cruciais do sistema. Armazena os blocos abstratos de lembranças extraídos pela IA de conversas anteriores. O Barão pode invocar novas memórias do subconsciente a partir de buscas vetoriais de proximidade de cosseno.
```sql
-- Ativação da extensão de vetores (executável por superusuário)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memorias_persistentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    origem_conversa_id UUID REFERENCES conversas(id) ON DELETE SET NULL,
    tipo_memoria VARCHAR(30) DEFAULT 'fato', -- 'fato', 'preferencia', 'pessoa_mencionada', 'trauma'
    conteudo TEXT NOT NULL, -- "A usuária tem as melhores lembranças de sua infância no sítio da avó."
    embedding VECTOR(1536) NOT NULL, -- Vetor gerado de 1536 dimensões (Padrão OpenAI/Gemini Embeddings)
    escore_relevancia NUMERIC(3,2) DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICE HNSW (Hierarchical Navigable Small World) para alta performance semântica
-- Este índice permite buscas instantâneas mesmo sob milhões de registros de memórias
CREATE INDEX idx_memorias_hnsw_embedding ON memorias_persistentes 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_memorias_usuario_tipo ON memorias_persistentes(usuario_id, tipo_memoria);
```

---

### 5. Dados Temporários, Logs e Telemetria

#### Tabela: `access_logs` (Logs de Acesso e Latência)
Arquivamento de auditoria e telemetria profunda, com expiração automática.
```sql
CREATE TABLE access_logs (
    id BIGSERIAL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    latency_ms INT NOT NULL,
    response_status INT NOT NULL,
    ip_address VARCHAR(45),
    dispositivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Particionamento mensal ou expiração por TTL de 30 dias para controle de peso físico do disco
```

---

## 📐 Estratégias Arquiteturais e Otimizações de Alto Nível

### A. Mecanismo pgvector (Busca Semântica no Subconsciente)
Para que o Barão saiba espontaneamente fatos da relação sem requerer o histórico de milhões de mensagens do chat, a aplicação implementa o algoritmo de **Retrieval-Augmented Generation (RAG)** em tempo real:
1. Ao enviar uma mensagem nova, a frase do usuário passa pelo modelo de embeddings, gerando um vetor de 1536 dimensões.
2. É feita uma query de busca de vizinhos mais próximos no PostgreSQL:
   ```sql
   SELECT conteudo, tipo_memoria, (embedding <=> $1) AS distancia
   FROM memorias_persistentes
   WHERE usuario_id = $2
   ORDER BY embedding <=> $1
   LIMIT 3;
   ```
3. O operador `<=>` calcula a **distância de cosseno**. As 3 melhores lembranças recuperadas de forma ultra veloz (graças ao índice **HNSW**) são inseridas de forma dinâmica no prompt invisível do Barão, ativando sua lembrança.

### B. Compressão de Memória e Controle de Contexto de LLM
*   **A "Janela Flutuante"**: Em vez de passar milhares de mensagens para o modelo Gemini de forma ingênua a cada nova frase (decorrente no aumento vertical de custo e lentidão por token excedente), os diálogos no chat utilizam uma janela flutuante das últimas 10 a 15 mensagens.
*   **Consolidação de Memória Semântica**: Quando a conversa atinge mais de 20 mensagens, uma tarefa assíncrona baseada em fila (Celery / BullMQ) lê o diálogo recente, extrai as novas pistas relacionais, apaga as mensagens antigas do histórico do chat local e converte esses fatos em novas linhas na tabela `memorias_persistentes` com seu respectivo embedding vetorial. Dessa forma, as conversas de anos de uso custam e rodam igual a conversas de um único dia.

### C. Estratégia de Particionamento para Escalar a Milhões
Tabelas que registram dados recorrentes como `mensagens`, `access_logs` e `historico_emocional` utilizam o recurso de **Particionamento por Range** no PostgreSQL. 
*   **Manutenibilidade:** Elimina o problema clássico de lentidão no operador `SELECT COUNT(*)` ou no gargalo de reconstrução de índices.
*   **Expiração Sem Esforço:** Em vez de executar queries lentas e bloqueantes como `DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '30 days'`, o gerenciador de tabelas executa de forma offline um comando leve e instantâneo: `DROP TABLE access_logs_y2026_m03`.

### D. Armazenamento JSONB e Schema Mutável para IA Infeirida
Campos como `insights_ia` na tabela `perfis_emocionais` armazenam dados de personalidades formados de maneira fluida pelas deduções contínuas da inteligência artificial. Por exemplo:
```json
{
  "apego_style": "ansioso",
  "temas_recorrentes": ["trabalho", "solidão", "cachorro_de_estimação"],
  "melhor_registro_hora_do_dia": "21:00",
  "atitude_perante_desafios": "evitação emocional"
}
```
Isso permite que engenheiros de dados estendam os traços comportamentais rastreáveis sem precisar de paralisações ou novos esquemas de migrations no banco de dados operacional principal.
