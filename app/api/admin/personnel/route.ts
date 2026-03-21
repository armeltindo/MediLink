import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// GET /api/admin/personnel — liste le personnel de l'établissement de l'admin
export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: adminProfile } = await supabase
    .from("users_profiles")
    .select("role, etablissement_id")
    .eq("id", user.id)
    .single();

  if (!adminProfile || !["super_admin", "admin_etablissement"].includes(adminProfile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Récupérer l'établissement cible depuis le cookie ou le profil
  const cookieStore = cookies();
  const etabIdFromCookie = cookieStore.get("selected_etablissement_id")?.value;
  const etablissementId = etabIdFromCookie || adminProfile.etablissement_id;

  if (!etablissementId) {
    return NextResponse.json({ error: "Aucun établissement sélectionné" }, { status: 400 });
  }

  // Lister tous les user_etablissements de cet établissement avec les profils
  const { data, error } = await supabase
    .from("user_etablissements")
    .select("id, user_id, suspended_at, created_at, users_profiles(id, nom, prenom, role, specialite, titre, telephone, deleted_at)")
    .eq("etablissement_id", etablissementId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// PATCH /api/admin/personnel — suspendre ou réactiver l'accès d'un membre
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: adminProfile } = await supabase
    .from("users_profiles")
    .select("role, etablissement_id")
    .eq("id", user.id)
    .single();

  if (!adminProfile || !["super_admin", "admin_etablissement"].includes(adminProfile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const cookieStore = cookies();
  const etabIdFromCookie = cookieStore.get("selected_etablissement_id")?.value;
  const etablissementId = etabIdFromCookie || adminProfile.etablissement_id;

  if (!etablissementId) {
    return NextResponse.json({ error: "Aucun établissement sélectionné" }, { status: 400 });
  }

  const { junction_id, suspend } = await request.json();
  if (!junction_id || typeof suspend !== "boolean") {
    return NextResponse.json({ error: "junction_id et suspend requis" }, { status: 400 });
  }

  // Vérifier que cette ligne appartient bien à l'établissement de l'admin
  const { data: junction } = await supabase
    .from("user_etablissements")
    .select("id, etablissement_id")
    .eq("id", junction_id)
    .single();

  if (!junction || junction.etablissement_id !== etablissementId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("user_etablissements")
    .update({ suspended_at: suspend ? new Date().toISOString() : null })
    .eq("id", junction_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: suspend ? "suspend_personnel_access" : "restore_personnel_access",
    details: JSON.stringify({ junction_id, etablissement_id: etablissementId }),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
