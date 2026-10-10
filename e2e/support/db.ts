import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * Direct database access for tests that need state the UI cannot produce —
 * chiefly a reset token, whose plaintext only ever exists in an email.
 *
 * Raw collections rather than the app's models, so a test can never be passed
 * by the code it is testing.
 */

async function db() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. Add it to .env.local.");
    await mongoose.connect(uri);
  }
  const database = mongoose.connection.db;
  if (!database) throw new Error("No database connection.");
  return database;
}

export async function createTestUser(email: string, password: string) {
  const database = await db();
  const now = new Date();
  const { insertedId } = await database.collection("users").insertOne({
    email,
    name: "E2E Reader",
    role: "customer",
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: now,
    updatedAt: now,
  });
  return insertedId;
}

/** Plants a reset token the way the app stores one, and returns its plaintext. */
export async function createResetToken(userId: mongoose.Types.ObjectId): Promise<string> {
  const database = await db();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await database.collection("passwordresettokens").insertOne({
    user: userId,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(now.getTime() + 30 * 60_000),
    createdAt: now,
    updatedAt: now,
  });
  return token;
}

export async function deleteTestUser(email: string) {
  const database = await db();
  const user = await database.collection("users").findOne({ email });
  if (user) {
    await database.collection("passwordresettokens").deleteMany({ user: user._id });
    await database.collection("users").deleteOne({ _id: user._id });
  }
}

export async function disconnect() {
  await mongoose.disconnect();
}
