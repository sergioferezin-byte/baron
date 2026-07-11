ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "password" text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diario_automatico_usuario_data_unique'
  ) THEN
    ALTER TABLE "diario_automatico" ADD CONSTRAINT "diario_automatico_usuario_data_unique" UNIQUE("usuario_id","data_resumo");
  END IF;
END $$;