export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const COOKIE_NAME = "selected_etablissement_id";
// 8 heures — durée d'une journée de travail type
const COOKIE_MAX_AGE = 8 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const { etablissement_id } = await request.json();

    if (!etablissement_id || typeof etablissement_id !== "string") {
      return NextResponse.json({ error: "etablissement_id requis" }, { status: 400 });
    }

    // Valider que l'utilisateur appartient bien à cet établissement
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier via user_etablissements OU users_profiles.etablissement_id
    const [{ data: junction }, { data: profile }] = await Promise.all([
      supabase
        .from("user_etablissements")
        .select("etablissement_id, suspended_at")
        .eq("user_id", user.id)
        .eq("etablissement_id", etablissement_id)
        .maybeSingle(),
      supabase
        .from("users_profiles")
        .select("etablissement_id, role")
        .eq("id", user.id)
        .single(),
    ]);

    const isAdmin = profile?.role === "super_admin" || profile?.role === "admin_etablissement";
    const isInJunction = !!junction;
    const isProfileEtab = profile?.etablissement_id === etablissement_id;

    if (!isAdmin && !isInJunction && !isProfileEtab) {
      return NextResponse.json(
        { error: "Vous n'êtes pas affecté à cet établissement" },
        { status: 403 }
      );
    }

    // Vérifier que l'accès n'est pas suspendu (uniquement pour les affectations via junction)
    if (isInJunction && junction?.suspended_at) {
      return NextResponse.json(
        { error: "Votre accès à cet établissement a été suspendu. Contactez votre administrateur." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, etablissement_id, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "strict",
      httpOnly: false, // lisible côté client pour l'affichage
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// Supprimer le cookie (lors de la déconnexion ou du changement d'établissement)
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  cookieStore.set("super_admin_access", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
