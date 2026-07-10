CREATE TABLE "access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"endpoint" varchar(255) NOT NULL,
	"latency_ms" integer NOT NULL,
	"response_status" integer NOT NULL,
	"ip_address" varchar(45),
	"dispositivo" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "album_emocional" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"titulo_momento" varchar(155) NOT NULL,
	"descricao_momento" text,
	"cronica_poetica" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"plano_atual" varchar(30) DEFAULT 'gratuito',
	"status" varchar(30) DEFAULT 'gratuito',
	"stripe_subscription_id" varchar(100),
	"data_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"data_fim" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "assinaturas_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "carteiras_creditos" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"tokens_disponiveis" bigint DEFAULT 50000,
	"tokens_consumidos_total" bigint DEFAULT 0,
	"ultima_recarga" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversas" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"persona_id" integer NOT NULL,
	"titulo" varchar(150) DEFAULT 'Nossa Conversa',
	"status" varchar(20) DEFAULT 'ativa',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "diario_automatico" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"data_resumo" date NOT NULL,
	"titulo_sintese" varchar(150),
	"conteudo_poetico" text NOT NULL,
	"humor_consolidado" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historico_emocional" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"conversa_id" integer NOT NULL,
	"escore_valencia" numeric(3, 2) NOT NULL,
	"escore_excitacao" numeric(3, 2) NOT NULL,
	"humor_detectado" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imagens_geradas" (
	"id" serial PRIMARY KEY NOT NULL,
	"album_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"prompt_confeccionado" text NOT NULL,
	"modelo_utilizado" varchar(50) DEFAULT 'imagen-4.0-generate-001',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memorias_persistentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"origem_conversa_id" integer,
	"tipo_memoria" varchar(30) DEFAULT 'fato',
	"conteudo" text NOT NULL,
	"embedding" vector(1536),
	"escore_relevancia" numeric(3, 2) DEFAULT '0.50',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversa_id" integer NOT NULL,
	"autor" varchar(20) NOT NULL,
	"conteudo_texto" text NOT NULL,
	"tokens_contabilizados" integer DEFAULT 0,
	"audio_gerado_url" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perfis_editaveis" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"idioma_preferido" varchar(10) DEFAULT 'pt-BR',
	"fatos_biografia" text,
	"genero_afetor" varchar(20) DEFAULT 'fem',
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo',
	"preferred_voice_id" varchar(50) DEFAULT 'barao_standard_v1',
	"avatar_model_style" varchar(30) DEFAULT 'classic_cinematic',
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perfis_emocionais" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"estado_espirito_corrente" varchar(100),
	"linguagem_amor_predileta" varchar(50),
	"gatilhos_ansiedade" text[],
	"insights_ia" jsonb DEFAULT '{}'::jsonb,
	"escore_empatia" numeric(3, 2) DEFAULT '0.00',
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"arquetipo" varchar(100) NOT NULL,
	"prompt_sistema" text NOT NULL,
	"config_voz_url" varchar(255),
	"config_avatar_url" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"nome_completo" varchar(150) NOT NULL,
	"apelido" varchar(50) NOT NULL,
	"data_nascimento" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuarios_uid_unique" UNIQUE("uid"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_emocional" ADD CONSTRAINT "album_emocional_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carteiras_creditos" ADD CONSTRAINT "carteiras_creditos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_automatico" ADD CONSTRAINT "diario_automatico_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_emocional" ADD CONSTRAINT "historico_emocional_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_emocional" ADD CONSTRAINT "historico_emocional_conversa_id_conversas_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagens_geradas" ADD CONSTRAINT "imagens_geradas_album_id_album_emocional_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."album_emocional"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorias_persistentes" ADD CONSTRAINT "memorias_persistentes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorias_persistentes" ADD CONSTRAINT "memorias_persistentes_origem_conversa_id_conversas_id_fk" FOREIGN KEY ("origem_conversa_id") REFERENCES "public"."conversas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conversa_id_conversas_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_editaveis" ADD CONSTRAINT "perfis_editaveis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_emocionais" ADD CONSTRAINT "perfis_emocionais_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;