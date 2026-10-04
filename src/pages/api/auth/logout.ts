import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  // Plain HTML form posts (Settings → Sign out) expect a page, not JSON.
  const wantsPage = !(request.headers.get("accept") || "").includes("application/json") &&
    (request.headers.get("content-type") || "").includes("form");
  try {
    const serverAuth = createServerAuth(cookies);

    // Sign out from Supabase
    const { error } = await serverAuth.supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
    }

    // Clear all possible auth cookies
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const projectRef = supabaseUrl.split(".")[0].split("//")[1];

    const cookieNames = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token.0`,
      `sb-${projectRef}-auth-token.1`,
    ];

    for (const cookieName of cookieNames) {
      cookies.delete(cookieName, { path: "/" });
    }

    console.log("🚪 User logged out and cookies cleared");

    if (wantsPage) return redirect("/login", 303);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
