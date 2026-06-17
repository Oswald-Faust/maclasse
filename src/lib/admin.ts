/**
 * Authentification admin minimale par clé partagée.
 * Définis ADMIN_PASSWORD dans un fichier .env.local pour la production.
 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "prof2026";

export function checkAuth(req: Request): boolean {
  const key = req.headers.get("x-admin-key");
  return Boolean(key) && key === ADMIN_PASSWORD;
}
