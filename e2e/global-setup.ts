import { disconnect, sweepTestData } from "./support/db";

/** Clears anything an earlier, interrupted run left behind before starting. */
export default async function globalSetup() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI provides the variables directly.
  }
  const removed = await sweepTestData();
  const total = Object.values(removed).reduce((a, b) => a + b, 0);
  if (total > 0) console.log("[e2e] cleared leftovers from an earlier run:", removed);
  await disconnect();
}
