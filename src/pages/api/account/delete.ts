import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/account/delete
 *
 * Permanently deletes the signed-in user's account and all their data via the
 * delete_my_account() database function (scoped to auth.uid()). Requires
 * { "confirm": "delete" } in the body so a stray request can't trigger it.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const serverAuth = createServerAuth(cookies);

  let user;
  try {
    user = await serverAuth.requireAuth();
  } catch {
    return json({ error: "Unauthorized", message: "Authentication required" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== "delete") {
    return json(
      { error: "ValidationError", message: 'Send { "confirm": "delete" } to delete your account.' },
      400,
    );
  }

  const { error } = await serverAuth.supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account deletion failed for", user.id, error.message);
    return json(
      { error: "DeleteFailed", message: "Your account couldn't be deleted. Nothing was removed — try again, or get in touch." },
      500,
    );
  }

  await serverAuth.supabase.auth.signOut().catch(() => undefined);
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split(".")[0].split("//")[1];
  if (projectRef) {
    for (const suffix of ["", ".0", ".1"]) {
      cookies.delete(`sb-${projectRef}-auth-token${suffix}`, { path: "/" });
    }
  }

  return json({ success: true });
};
