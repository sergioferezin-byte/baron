import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase-admin.ts";

/**
 * Acesso à área admin.
 *
 * Não existe mais senha fixa no código. Há duas formas de entrar:
 *  1. Login normal do Supabase com um e-mail listado em ADMIN_EMAILS
 *     (variável de ambiente, separada por vírgula). É a forma recomendada.
 *  2. A senha da variável ADMIN_PASSWORD, com pelo menos 12 caracteres,
 *     enviada no cabeçalho "x-admin-senha". Serve para o primeiro acesso.
 *
 * Sem nenhuma das duas variáveis configuradas, a área admin fica fechada.
 */

export interface AdminRequest extends Request {
  admin?: { email: string; via: "conta" | "senha" };
}

function emailsAdmin(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function senhaAdmin(): string | null {
  const senha = process.env.ADMIN_PASSWORD || "";
  return senha.length >= 12 ? senha : null;
}

function senhaConfere(recebida: string, esperada: string): boolean {
  const a = crypto.createHash("sha256").update(recebida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

export function adminConfigurado(): boolean {
  return emailsAdmin().length > 0 || !!senhaAdmin();
}

export async function identificarAdmin(req: Request): Promise<AdminRequest["admin"] | null> {
  const senhaRecebida = req.headers["x-admin-senha"];
  const esperada = senhaAdmin();
  if (typeof senhaRecebida === "string" && senhaRecebida && esperada && senhaConfere(senhaRecebida, esperada)) {
    return { email: "senha-admin", via: "senha" };
  }

  const auth = req.headers.authorization;
  const lista = emailsAdmin();
  if (supabaseAdmin && lista.length && auth?.startsWith("Bearer ")) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
      const email = data?.user?.email?.toLowerCase();
      if (!error && email && lista.includes(email)) {
        return { email, via: "conta" };
      }
    } catch (err) {
      console.error("[Admin] Falha ao validar sessão:", err);
    }
  }
  return null;
}

export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  if (!adminConfigurado()) {
    return res.status(503).json({
      error: "Área admin desativada. Configure ADMIN_EMAILS (ou ADMIN_PASSWORD com 12+ caracteres) na Vercel."
    });
  }
  const admin = await identificarAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Acesso de administrador negado." });
  }
  req.admin = admin;
  next();
}
