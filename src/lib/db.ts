import mongoose from "mongoose";

import { requireEnv } from "@/lib/env";

/**
 * Mongoose connection helper.
 *
 * The connection promise is stashed on `globalThis` so hot reloads in dev and
 * warm serverless invocations in production reuse one pool instead of opening a
 * new connection per request.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose._mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose
    .connect(requireEnv("MONGODB_URI"), {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((error: unknown) => {
      // Clear the failed attempt so the next call can retry instead of
      // permanently resolving to a rejected promise.
      cache.promise = null;
      throw error;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!cache.conn) return;
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
