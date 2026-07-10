import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase-admin.ts";

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    if (!supabaseAdmin) {
      // If Supabase is not fully configured on server, let requests pass or handle gracefully
      // To ensure no blocker for users in local/preview fallback, we can decode JWT loosely or mock.
      // But let's verify with supabaseAdmin first if it's initialized.
      console.warn("[Auth Middleware] Supabase admin not initialized. Skipping strict verification in development/fallback.");
      req.user = { uid: "guest-dev", email: "guest@example.com" };
      return next();
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Error verifying Supabase token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
