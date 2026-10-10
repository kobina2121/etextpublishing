import { deleteTestUser, disconnect } from "./support/db";
import { TEST_ADMIN_EMAIL } from "./support/admin-session";

/** Removes the test admin, so no admin account outlives the run that made it. */
export default async function globalTeardown() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI provides the variables directly.
  }
  await deleteTestUser(TEST_ADMIN_EMAIL);
  await disconnect();
}
