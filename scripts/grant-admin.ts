/**
 * Grants or revokes admin on an email address.
 *
 *   npm run grant-admin -- someone@example.com
 *   npm run grant-admin -- someone@example.com --revoke
 *
 * Neither sign-up nor sign-in ever creates anything above a customer. So this
 * is the one place staff access is granted, and it
 * is deliberately a command on the server rather than a button in the app: a
 * screen that can promote an account is a screen worth attacking.
 *
 * The address does not have to exist yet. Creating the record first means the
 * very first Google sign-in from that address lands as an admin, rather than
 * as a customer who then has to be promoted.
 */
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const force = args.includes("--force");
  const email = args
    .find((a) => !a.startsWith("--"))
    ?.trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run grant-admin -- <email> [--revoke] [--force]");
    process.exit(1);
  }

  await connectToDatabase();

  const existing = await User.findOne({ email });

  if (revoke) {
    if (!existing) {
      console.error(`No account for ${email}.`);
      process.exit(1);
    }
    existing.role = "customer";
    await existing.save();
    console.log(`${email} is now a customer. They keep their orders and lose the dashboard.`);
    return;
  }

  if (existing) {
    // Sign-up does not verify addresses, so a password account Google has
    // never linked may belong to someone who registered this email before
    // its owner did. Promoting it would hand them the dashboard.
    if (
      existing.role !== "admin" &&
      existing.passwordHash &&
      !existing.googleId &&
      !existing.emailVerifiedAt &&
      !force
    ) {
      console.error(
        `${email} signed up with a password, and that address has never been verified.`,
      );
      console.error("Whoever registered it may not own the mailbox. Either have them sign in");
      console.error(
        "with Google once (which verifies it), or re-run with --force if you are sure.",
      );
      process.exit(1);
    }

    const before = existing.role;
    existing.role = "admin";
    await existing.save();
    console.log(
      before === "admin"
        ? `${email} was already an admin. Nothing changed.`
        : `${email} promoted from ${before} to admin.`,
    );
    console.log(
      existing.googleId
        ? "Google is linked, so they can sign in now."
        : "Google is not linked yet — sign in once with Google at this address and it will match by email.",
    );
    return;
  }

  // No password: an account with a password nobody chose is a guessable
  // account. They sign in with Google, which matches this record by email.
  await User.create({
    email,
    name: email.split("@")[0] || "Administrator",
    role: "admin",
  });
  console.log(`Created an admin for ${email}.`);
  console.log("Sign in with Google at that address and you will land on the dashboard.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
