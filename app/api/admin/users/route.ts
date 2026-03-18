import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

// GET /api/admin/users — liste tous les profils utilisateurs
export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin_etablissement"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("users_profiles")
    .select("id, nom, prenom, role, specialite, telephone, etablissement_id, numero_ordre, titre, created_at, deleted_at, etablissements(nom)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/users — crée un profil utilisateur (après invitation Supabase Auth)
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin_etablissement"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { nom, prenom, role, specialite, telephone, etablissement_id, numero_ordre, titre } = body;

  if (!nom || !prenom || !role) {
    return NextResponse.json({ error: "Nom, prénom et rôle requis" }, { status: 400 });
  }

  const validRoles = ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  // Log the admin action
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create_user_profile",
    details: JSON.stringify({ nom, prenom, role }),
    timestamp: new Date().toISOString(),
  });

  const { data: newProfile, error: insertError } = await supabase
    .from("users_profiles")
    .insert({ nom, prenom, role, specialite, telephone, etablissement_id, numero_ordre, titre })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(newProfile, { status: 201 });
}

// PATCH /api/admin/users — met à jour un profil (désactivation, changement rôle)
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin_etablissement"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  // Prevent self-demotion
  if (id === user.id && updates.role && updates.role !== profile.role) {
    return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("users_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "update_user_profile",
    details: JSON.stringify({ target_id: id, updates }),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
