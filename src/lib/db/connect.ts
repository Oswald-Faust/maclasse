import mongoose from "mongoose";

/**
 * Connexion MongoDB mise en cache pour survivre au hot-reload de Next.js
 * (évite d'ouvrir une nouvelle connexion à chaque requête en dev).
 */

const MONGODB_URI = process.env.MONGODB_URI;

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: Cached | undefined;
}

const cached: Cached = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI manquant. Configure-le dans .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
