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

/** The admin that admin tests sign in as. Created once, reused within a run. */
export async function ensureTestAdmin(
  email: string,
): Promise<{ id: string; sessionVersion: number }> {
  const database = await db();
  const now = new Date();
  const doc = await database.collection("users").findOneAndUpdate(
    { email },
    {
      $setOnInsert: { email, name: "E2E Admin", sessionVersion: 0, createdAt: now },
      $set: { role: "admin", updatedAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error("Could not create the test admin.");
  return { id: doc._id.toString(), sessionVersion: Number(doc.sessionVersion ?? 0) };
}

export async function setRole(email: string, role: "admin" | "customer") {
  const database = await db();
  await database.collection("users").updateOne({ email }, { $set: { role } });
}

/** A paid order, as Paystack's settlement would leave it. Returns its reference. */
export async function createPaidOrder(input: {
  publicationId: string;
  title: string;
  slug: string;
  edition: "softcopy" | "hardcopy";
  status?: "paid" | "pending";
}): Promise<string> {
  const database = await db();
  const reference = `etx_e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  await database.collection("orders").insertOne({
    reference,
    email: "e2e-buyer@example.com",
    customerName: "E2E Buyer",
    items: [
      {
        publication: new mongoose.Types.ObjectId(input.publicationId),
        title: input.title,
        slug: input.slug,
        edition: input.edition,
        unitPrice: 4500,
        quantity: 1,
        requiresShipping: input.edition === "hardcopy",
      },
    ],
    total: 4500,
    currency: "GHS",
    requiresShipping: input.edition === "hardcopy",
    status: input.status ?? "paid",
    fulfilment: input.edition === "hardcopy" ? "pending" : "not_required",
    ...(input.status === "pending" ? {} : { paidAt: now, fulfilledAt: now }),
    createdAt: now,
    updatedAt: now,
  });
  return reference;
}

export async function publicationIdBySlug(slug: string): Promise<string> {
  const database = await db();
  const doc = await database
    .collection("publications")
    .findOne({ slug }, { projection: { _id: 1 } });
  if (!doc) throw new Error(`No publication ${slug}`);
  return doc._id.toString();
}

export async function deleteOrders(references: string[]) {
  const database = await db();
  await database.collection("orders").deleteMany({ reference: { $in: references } });
}

/**
 * Removes every record a test run can create — all named "E2E …" or with an
 * e2e- address — and the files they point at.
 *
 * Runs before and after each run. The suite shares the live site's database,
 * so a run cut short (a failure, Ctrl-C) used to leave published test titles
 * visible to visitors until someone noticed.
 */
export async function sweepTestData(): Promise<Record<string, number>> {
  const database = await db();
  const removed: Record<string, number> = {};
  const fileIds = (docs: { [key: string]: unknown }[], field: string) =>
    docs
      .map((doc) => doc[field])
      .filter((key): key is string => typeof key === "string" && key.startsWith("db:"))
      .map((key) => new mongoose.Types.ObjectId(key.slice(3)));

  const publications = await database.collection("publications").find({ title: /^E2E / }).toArray();
  await database
    .collection("softcopyfiles")
    .deleteMany({ _id: { $in: fileIds(publications, "digitalFileKey") } });
  removed.publications = (
    await database.collection("publications").deleteMany({ title: /^E2E / })
  ).deletedCount;

  const journals = await database.collection("journals").find({ title: /^E2E / }).toArray();
  await database
    .collection("journalfiles")
    .deleteMany({ _id: { $in: fileIds(journals, "pdfKey") } });
  removed.journals = (
    await database.collection("journals").deleteMany({ title: /^E2E / })
  ).deletedCount;

  const submissions = await database
    .collection("manuscriptsubmissions")
    .find({ email: /^e2e-/ })
    .toArray();
  await database
    .collection("manuscriptfiles")
    .deleteMany({ _id: { $in: fileIds(submissions, "fileKey") } });
  removed.submissions = (
    await database.collection("manuscriptsubmissions").deleteMany({ email: /^e2e-/ })
  ).deletedCount;

  removed.categories = (
    await database.collection("categories").deleteMany({ name: /^E2E / })
  ).deletedCount;
  removed.orders = (
    await database
      .collection("orders")
      .deleteMany({ $or: [{ reference: /^etx_e2e_/ }, { email: /^e2e-/ }] })
  ).deletedCount;
  removed.messages = (
    await database.collection("contactmessages").deleteMany({ email: /^e2e-/ })
  ).deletedCount;
  const users = await database
    .collection("users")
    .find({ email: /^e2e-/ })
    .project({ _id: 1 })
    .toArray();
  await database
    .collection("passwordresettokens")
    .deleteMany({ user: { $in: users.map((u) => u._id) } });
  removed.users = (await database.collection("users").deleteMany({ email: /^e2e-/ })).deletedCount;
  return removed;
}

export async function disconnect() {
  await mongoose.disconnect();
}
