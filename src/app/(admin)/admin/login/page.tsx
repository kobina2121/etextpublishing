import { redirect } from "next/navigation";

/**
 * Kept only so old bookmarks and links keep working.
 *
 * There is one sign-in page now. Staff and readers use the same form and are
 * routed by role afterwards, so a separate admin form was one more thing to
 * keep in step for no benefit.
 */
export default async function AdminLoginRedirect({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const raw = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
