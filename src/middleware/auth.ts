import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase-admin.ts";

export interface AuthRequest extends Request {
  user?: { id: string; email?: string } | null;
}

/**
 * Verifies the Supabase JWT sent as "Authorization: Bearer <token>".
 * When Supabase is not configured (local/dev mode), requests pass through
 * with req.user = null and routes fall back to trusting the uid parameter.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!supabaseAdmin) {
    req.user = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado: token ausente. Faça login novamente." });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Não autenticado: sessão inválida ou expirada." });
    }

    req.user = { id: user.id, email: user.email ?? undefined };
    next();
  } catch (error) {
    console.error("Error verifying Supabase token:", error);
    return res.status(401).json({ error: "Não autenticado: falha ao validar sessão." });
  }
};

/**
 * Returns true when the authenticated user may act on the given uid.
 * With Supabase disabled (req.user == null) ownership cannot be verified,
 * so access is allowed (dev/local fallback).
 */
export function ownsUid(req: AuthRequest, uid: string): boolean {
  return !req.user || req.user.id === uid;
}
