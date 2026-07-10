import { db } from "./index.ts";
import { usuarios } from "./schema.ts";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(
  uid: string,
  email: string,
  nomeCompleto: string,
  apelido: string
) {
  try {
    const result = await db
      .insert(usuarios)
      .values({
        uid,
        email,
        nomeCompleto,
        apelido,
      })
      .onConflictDoUpdate({
        target: usuarios.uid,
        set: {
          email,
          nomeCompleto,
          apelido,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to get or create user in DB:", error);
    throw new Error("Database operation failed. Please try again later.", {
      cause: error,
    });
  }
}
