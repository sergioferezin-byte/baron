import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  date,
  customType,
  bigint,
  unique,
} from "drizzle-orm/pg-core";

// Custom type for pgvector
const pgVector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },
});

// 1. Dados Permanentes e Relacionais Core

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"), // Local sign up password
  nomeCompleto: varchar("nome_completo", { length: 150 }).notNull(),
  apelido: varchar("apelido", { length: 50 }).notNull(),
  dataNascimento: date("data_nascimento"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const perfisEditaveis = pgTable("perfis_editaveis", {
  usuarioId: integer("usuario_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  idiomaPreferido: varchar("idioma_preferido", { length: 10 }).default("pt-BR"),
  fatosBiografia: text("fatos_biografia"),
  generoAfetor: varchar("genero_afetor", { length: 20 }).default("fem"),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  preferredVoiceId: varchar("preferred_voice_id", { length: 50 }).default("barao_standard_v1"),
  avatarModelStyle: varchar("avatar_model_style", { length: 30 }).default("classic_cinematic"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const assinaturas = pgTable("assinaturas", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  planoAtual: varchar("plano_atual", { length: 30 }).default("gratuito"), // gratuito, conforto, sintonia_total
  status: varchar("status", { length: 30 }).default("gratuito"), // ativa, cancelada, inadimplente, trialing
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }).unique(),
  dataInicio: timestamp("data_inicio", { withTimezone: true }).notNull().defaultNow(),
  dataFim: timestamp("data_fim", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const carteirasCreditos = pgTable("carteiras_creditos", {
  usuarioId: integer("usuario_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tokensDisponiveis: bigint("tokens_disponiveis", { mode: "number" }).default(50000),
  tokensConsumidosTotal: bigint("tokens_consumidos_total", { mode: "number" }).default(0),
  ultimaRecarga: timestamp("ultima_recarga", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 2. Relacionais e Interações

export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  arquetipo: varchar("arquetipo", { length: 100 }).notNull(),
  promptSistema: text("prompt_sistema").notNull(),
  configVozUrl: varchar("config_voz_url", { length: 255 }),
  configAvatarUrl: varchar("config_avatar_url", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const conversas = pgTable("conversas", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  titulo: varchar("titulo", { length: 150 }).default("Nossa Conversa"),
  status: varchar("status", { length: 20 }).default("ativa"), // ativa, arquivada, concluida
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Mensagens Table (Range partitioning would be done at database-level, here we define standard table structure)
export const mensagens = pgTable("mensagens", {
  id: serial("id").primaryKey(),
  conversaId: integer("conversa_id")
    .notNull()
    .references(() => conversas.id, { onDelete: "cascade" }),
  autor: varchar("autor", { length: 20 }).notNull(), // usuario, barao
  conteudoTexto: text("conteudo_texto").notNull(),
  tokensContabilizados: integer("tokens_contabilizados").default(0),
  audioGeradoUrl: varchar("audio_gerado_url", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 3. Dados Emocionais (Subjetivos e Afetivos)

export const albumEmocional = pgTable("album_emocional", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tituloMomento: varchar("titulo_momento", { length: 155 }).notNull(),
  descricaoMomento: text("descricao_momento"),
  cronicaPoetica: text("cronica_poetica"), // A narrativa afetiva escrita pelo Barão
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const imagensGeradas = pgTable("imagens_geradas", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albumEmocional.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  promptConfeccionado: text("prompt_confeccionado").notNull(),
  modeloUtilizado: varchar("modelo_utilizado", { length: 50 }).default("imagen-4.0-generate-001"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const diarioAutomatico = pgTable(
  "diario_automatico",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    dataResumo: date("data_resumo").notNull(),
    tituloSintese: varchar("titulo_sintese", { length: 150 }),
    conteudoPoetico: text("conteudo_poetico").notNull(),
    humorConsolidado: varchar("humor_consolidado", { length: 50 }), // Esperança, Saudade, Melancolia, Alegria
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("diario_automatico_usuario_data_unique").on(t.usuarioId, t.dataResumo)]
);

// 4. Dados Inferidos pela IA (Memória Semântica e Perfil de Aprendizado)

export const perfisEmocionais = pgTable("perfis_emocionais", {
  usuarioId: integer("usuario_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  estadoEspiritoCorrente: varchar("estado_espirito_corrente", { length: 100 }),
  linguagemAmorPredileta: varchar("linguagem_amor_predileta", { length: 50 }),
  gatilhosAnsiedade: text("gatilhos_ansiedade").array(),
  insightsIa: jsonb("insights_ia").default({}),
  escoreEmpatia: numeric("escore_empatia", { precision: 3, scale: 2 }).default("0.00"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const historicoEmocional = pgTable("historico_emocional", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  conversaId: integer("conversa_id")
    .notNull()
    .references(() => conversas.id, { onDelete: "cascade" }),
  escoreValencia: numeric("escore_valencia", { precision: 3, scale: 2 }).notNull(),
  escoreExcitacao: numeric("escore_excitacao", { precision: 3, scale: 2 }).notNull(),
  humorDetectado: varchar("humor_detectado", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const memoriasPersistentes = pgTable("memorias_persistentes", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  origemConversaId: integer("origem_conversa_id")
    .references(() => conversas.id, { onDelete: "set null" }),
  tipoMemoria: varchar("tipo_memoria", { length: 30 }).default("fato"), // fato, preferencia, pessoa_mencionada, trauma
  conteudo: text("conteudo").notNull(),
  embedding: pgVector("embedding"), // pgvector
  escoreRelevancia: numeric("escore_relevancia", { precision: 3, scale: 2 }).default("0.50"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 5. Dados Temporários, Logs e Telemetria

export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  latencyMs: integer("latency_ms").notNull(),
  responseStatus: integer("response_status").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  dispositivo: text("dispositivo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relationships

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  perfilEditavel: one(perfisEditaveis, {
    fields: [usuarios.id],
    references: [perfisEditaveis.usuarioId],
  }),
  assinaturas: many(assinaturas),
  carteiraCreditos: one(carteirasCreditos, {
    fields: [usuarios.id],
    references: [carteirasCreditos.usuarioId],
  }),
  conversas: many(conversas),
  albuns: many(albumEmocional),
  diarios: many(diarioAutomatico),
  perfilEmocional: one(perfisEmocionais, {
    fields: [usuarios.id],
    references: [perfisEmocionais.usuarioId],
  }),
  historicosEmocionais: many(historicoEmocional),
  memoriasPersistentes: many(memoriasPersistentes),
  logs: many(accessLogs),
}));

export const perfisEditaveisRelations = relations(perfisEditaveis, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [perfisEditaveis.usuarioId],
    references: [usuarios.id],
  }),
}));

export const assinaturasRelations = relations(assinaturas, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [assinaturas.usuarioId],
    references: [usuarios.id],
  }),
}));

export const carteirasCreditosRelations = relations(carteirasCreditos, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [carteirasCreditos.usuarioId],
    references: [usuarios.id],
  }),
}));

export const conversasRelations = relations(conversas, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [conversas.usuarioId],
    references: [usuarios.id],
  }),
  persona: one(personas, {
    fields: [conversas.personaId],
    references: [personas.id],
  }),
  mensagens: many(mensagens),
  historicosEmocionais: many(historicoEmocional),
  memoriasPersistentes: many(memoriasPersistentes),
}));

export const personasRelations = relations(personas, ({ many }) => ({
  conversas: many(conversas),
}));

export const mensagensRelations = relations(mensagens, ({ one }) => ({
  conversa: one(conversas, {
    fields: [mensagens.conversaId],
    references: [conversas.id],
  }),
}));

export const albumEmocionalRelations = relations(albumEmocional, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [albumEmocional.usuarioId],
    references: [usuarios.id],
  }),
  imagens: many(imagensGeradas),
}));

export const imagensGeradasRelations = relations(imagensGeradas, ({ one }) => ({
  album: one(albumEmocional, {
    fields: [imagensGeradas.albumId],
    references: [albumEmocional.id],
  }),
}));

export const diarioAutomaticoRelations = relations(diarioAutomatico, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [diarioAutomatico.usuarioId],
    references: [usuarios.id],
  }),
}));

export const perfisEmocionaisRelations = relations(perfisEmocionais, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [perfisEmocionais.usuarioId],
    references: [usuarios.id],
  }),
}));

export const historicoEmocionalRelations = relations(historicoEmocional, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [historicoEmocional.usuarioId],
    references: [usuarios.id],
  }),
  conversa: one(conversas, {
    fields: [historicoEmocional.conversaId],
    references: [conversas.id],
  }),
}));

export const memoriasPersistentesRelations = relations(memoriasPersistentes, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [memoriasPersistentes.usuarioId],
    references: [usuarios.id],
  }),
  origemConversa: one(conversas, {
    fields: [memoriasPersistentes.origemConversaId],
    references: [conversas.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [accessLogs.usuarioId],
    references: [usuarios.id],
  }),
}));
