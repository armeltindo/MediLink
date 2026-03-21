import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.NEXT_PUBLIC_APP_URL ?? "medilink-demo-2026";

async function verifyDemoSession(cookieValue: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(cookieValue);
    const { _sig, ...rest } = parsed;
    if (!_sig || typeof _sig !== "string") return false;
    const payload = JSON.stringify({ email: rest.email, role: rest.role, prenom: rest.prenom, nom: rest.nom });
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(DEMO_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return _sig === expected;
  } catch {
    return false;
  }
}

// Routes accessibles uniquement aux admins
const ADMIN_ONLY_PATHS = ["/admin", "/audit"];
// Routes accessibles à tous les rôles authentifiés
const PROTECTED_PATHS = ["/dashboard", "/patients", "/consultations", "/prescriptions", "/analyses", "/vaccinations", "/hospitalisations", "/documents", "/etablissements", "/rendez-vous"];
// Page de sélection d'établissement (accessible aux authentifiés sans cookie d'établissement)
const SELECT_ETAB_PATH = "/select-etablissement";

const ADMIN_ROLES = ["super_admin", "admin_etablissement"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = pathname === "/login" || pathname === "/" || pathname === "/forgot-password" || pathname === "/reset-password";
  const isSelectEtabPath = pathname === SELECT_ETAB_PATH;

  // Guard: if Supabase env vars are not configured, use demo session cookie
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const demoSession = request.cookies.get("demo_session");

    // Verify demo session signature to prevent cookie forgery
    if (!isPublicPath) {
      if (!demoSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // Validate the HMAC signature embedded in the cookie
      const validSession = await verifyDemoSession(demoSession.value);
      if (!validSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        const response = NextResponse.redirect(url);
        response.cookies.delete("demo_session");
        return response;
      }
    }

    if (demoSession && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // En mode démo, pas de sélection d'établissement nécessaire
    return NextResponse.next();
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Not authenticated → redirect to login
    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Already authenticated → redirect away from login
    if (user && (pathname === "/login" || pathname === "/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Sélection d'établissement obligatoire avant l'accès aux pages protégées
    if (user && !isPublicPath && !isSelectEtabPath) {
      const selectedEtab = request.cookies.get("selected_etablissement_id");
      if (!selectedEtab) {
        const url = request.nextUrl.clone();
        url.pathname = SELECT_ETAB_PATH;
        return NextResponse.redirect(url);
      }
    }

    // Si l'utilisateur a déjà sélectionné un établissement, pas besoin de repasser par la page
    if (user && isSelectEtabPath) {
      const selectedEtab = request.cookies.get("selected_etablissement_id");
      if (selectedEtab) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // Role-based access for admin-only routes
    if (user && ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      const { data: profile } = await supabase
        .from("users_profiles")
        .select("role, deleted_at")
        .eq("id", user.id)
        .single();

      // Disabled account
      if (profile?.deleted_at) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "account_disabled");
        return NextResponse.redirect(url);
      }

      if (!profile || !ADMIN_ROLES.includes(profile.role)) {
        // Redirect to dashboard with error
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "access_denied");
        return NextResponse.redirect(url);
      }
    }

    // Check disabled accounts on any protected path
    if (user && PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
      const { data: profile } = await supabase
        .from("users_profiles")
        .select("deleted_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.deleted_at) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "account_disabled");
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
