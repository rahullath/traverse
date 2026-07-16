import { defineMiddleware } from "astro:middleware";
import { createServerAuth } from "./lib/auth/simple-multi-user";
import { RouteClassifier } from "./lib/utils/route-classifier";
import { getBillingSnapshot } from "./lib/billing/subscription";

const REDIRECTS: Record<string, string> = {
  "/dashboard":  "/today",
  "/daily-plan": "/plan",
  "/habits":     "/settings",
  "/calendar":   "/settings/calendar",
  "/profile":    "/settings",
  "/billing":    "/settings",
  "/import":     "/settings",
};

export const onRequest = defineMiddleware(
  async ({ url, cookies, redirect }, next) => {
    const { pathname } = url;

    // Phase 4 IA collapse — redirect old routes to new ones
    if (REDIRECTS[pathname]) return redirect(REDIRECTS[pathname], 301);
    if (pathname.startsWith("/habits/"))     return redirect("/settings", 301);
    if (pathname.startsWith("/daily-plan/")) return redirect("/plan", 301);

    // Classify the route to determine how to handle it
    const classification = RouteClassifier.classifyRoute(pathname);

    // Early return for static assets - skip all auth processing
    if (classification.isStatic) {
      // Only log static asset requests in development or when debugging
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📁 Static asset: ${pathname} (${classification.matchedPattern})`,
        );
      }
      return next();
    }

    // Conditional logging based on route type
    if (classification.isPublic) {
      console.log(`🌐 Public route: ${pathname}`);
    } else {
      console.log(`🔒 Protected route: ${pathname}`);
    }

    // Always allow API routes and public routes (except root which needs special handling)
    if (
      pathname.startsWith("/api/") ||
      (classification.isPublic && pathname !== "/")
    ) {
      console.log(`✅ Route allowed: ${pathname}`);
      return next();
    }

    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    // Handle root path specifically
    if (pathname === "/") {
      if (!user) {
        // Unauthenticated user on landing page - allow access
        console.log(`🏠 Unauthenticated user on landing page`);
        return next();
      } else {
        // Authenticated user on landing page - redirect to today
        console.log(
          `🔄 Authenticated user on landing, redirecting to today`,
        );
        return redirect("/today");
      }
    }

    // For protected routes, check authentication
    if (classification.requiresAuth) {
      if (!user) {
        console.log(
          `🚫 Authentication required for ${pathname}, redirecting to login`,
        );
        return redirect("/login");
      }

      console.log(`👤 Authenticated user: ${user.email || user.id}`);

      // Check onboarding status for authenticated users on protected routes
      try {
        const preferences = await serverAuth.getUserPreferences(user.id);
        const hasCompletedOnboarding = !!preferences;

        console.log(
          `📋 Onboarding status: ${hasCompletedOnboarding ? "complete" : "pending"}`,
        );
        // Force onboarding if not completed, while allowing explicit bypass routes.
        if (
          !hasCompletedOnboarding &&
          pathname !== "/onboarding" &&
          pathname !== "/skip-onboarding" &&
          pathname !== "/bypass-onboarding"
        ) {
          console.log(`📝 Redirecting to onboarding from ${pathname}`);
          return redirect("/onboarding");
        }

        // Note: /onboarding itself decides whether there's a pending phase-2
        // preset flow to show (see src/pages/onboarding.astro) — middleware
        // must not blanket-redirect it away once phase 1 is complete, or the
        // phase-2 preset surface (Phase 11) would be unreachable.

        const billing = getBillingSnapshot(preferences);
        const billingExemptRoutes = new Set([
          "/billing",
          "/settings",
          "/logout",
        ]);
        if (!billing.isAccessAllowed && !billingExemptRoutes.has(pathname)) {
          console.log(
            `💳 Trial/subscription gate redirect from ${pathname} to /billing`,
          );
          return redirect("/billing");
        }
      } catch (error) {
        console.error(
          `⚠️ Middleware error for protected route ${pathname}:`,
          error,
        );
        // On error, allow access but log the issue
      }
    }

    console.log(`✅ Access granted to ${pathname}`);
    return next();
  },
);
