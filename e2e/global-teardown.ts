import { disconnect, sweepTestData } from "./support/db";

/**
 * Removes every test record, the test admin included, so no run — finished or
 * cut short — leaves test data on the site.
 */
export default async function globalTeardown() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI provides the variables directly.
  }
  await sweepTestData();
  await disconnect();
}
