import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

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

const PARAMEDICAL_ROLES = ["medecin", "infirmier", "laborantin", "pharmacien"];

// GET /api/admin/users — liste les profils utilisateurs
// super_admin : tous les utilisateurs
// admin_etablissement : uniquement les utilisateurs de son établissement
export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const cookieStore = cookies();
  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role, etablissement_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin_etablissement"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const SELECT_FIELDS = "id, nom, prenom, role, specialite, telephone, etablissement_id, numero_ordre, titre, created_at, deleted_at, etablissements(nom), user_etablissements(etablissement_id, etablissements(id, nom))";

  // super_admin : tous les profils
  if (profile.role === "super_admin") {
    const { data, error } = await supabase
      .from("users_profiles")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // admin_etablissement : seulement les utilisateurs de son établissement
  const etabId = cookieStore.get("selected_etablissement_id")?.value || profile.etablissement_id;
  if (!etabId) return NextResponse.json({ error: "Aucun établissement sélectionné" }, { status: 400 });

  // Récupérer les user_id liés à cet établissement via la junction table
  const { data: junctions } = await supabase
    .from("user_etablissements")
    .select("user_id")
    .eq("etablissement_id", etabId);

  const junctionUserIds = (junctions || []).map((j) => j.user_id);

  // Inclure aussi les admins dont etablissement_id correspond (ex: admin_etablissement du même établissement)
  const { data, error } = await supabase
    .from("users_profiles")
    .select(SELECT_FIELDS)
    .or(
      junctionUserIds.length > 0
        ? `id.in.(${junctionUserIds.join(",")}),etablissement_id.eq.${etabId}`
        : `etablissement_id.eq.${etabId}`
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/users — invite un utilisateur via Supabase Auth puis crée son profil
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role, etablissement_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin_etablissement"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { email, nom, prenom, role, specialite, telephone, numero_ordre, titre } = body;
  let { etablissement_id, etablissement_ids } = body;

  if (!email || !nom || !prenom || !role) {
    return NextResponse.json({ error: "Email, nom, prénom et rôle requis" }, { status: 400 });
  }

  const validRoles = ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  // admin_etablissement : forcer son propre établissement, ignorer ce que le frontend envoie
  if (profile.role === "admin_etablissement") {
    const cookieStore = cookies();
    const adminEtabId = cookieStore.get("selected_etablissement_id")?.value || profile.etablissement_id;
    if (!adminEtabId) {
      return NextResponse.json({ error: "Aucun établissement associé à votre compte" }, { status: 400 });
    }
    etablissement_id = adminEtabId;
    etablissement_ids = [adminEtabId];
  }

  // Utiliser le client service role pour inviter l'utilisateur via Supabase Auth
  const serviceSupabase = createServerSupabaseClient();
  const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
    data: { nom, prenom, role },
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const newUserId = inviteData.user.id;

  // For paramedical roles, etablissement_id in users_profiles stays null (handled via junction table)
  const profileEtabId = PARAMEDICAL_ROLES.includes(role) ? null : (etablissement_id || null);

  // Log the admin action
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create_user_profile",
    details: JSON.stringify({ nom, prenom, role, email }),
    timestamp: new Date().toISOString(),
  });

  const { data: newProfile, error: insertError } = await serviceSupabase
    .from("users_profiles")
    .insert({ id: newUserId, nom, prenom, role, specialite, telephone, etablissement_id: profileEtabId, numero_ordre, titre })
    .select()
    .single();

  if (insertError) {
    // Supprimer l'utilisateur auth créé si le profil échoue
    await serviceSupabase.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Insert junction table records for paramedical roles
  if (PARAMEDICAL_ROLES.includes(role) && Array.isArray(etablissement_ids) && etablissement_ids.length > 0) {
    // Valider que les établissements existent et ne sont pas supprimés
    const { data: validEtabs } = await serviceSupabase
      .from("etablissements")
      .select("id")
      .in("id", etablissement_ids)
      .is("deleted_at", null);
    const validIds = (validEtabs || []).map((e) => e.id);
    if (validIds.length === 0) {
      await serviceSupabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: "Aucun établissement valide trouvé parmi les IDs fournis" }, { status: 400 });
    }
    const junctionRows = validIds.map((eid: string) => ({
      user_id: newProfile.id,
      etablissement_id: eid,
    }));
    const { error: junctionError } = await serviceSupabase
      .from("user_etablissements")
      .insert(junctionRows);
    if (junctionError) {
      console.error("user_etablissements insert error:", junctionError.message);
    }
  }

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
  const { id, etablissement_ids, ...updates } = body;

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

  // Update junction table if etablissement_ids provided
  if (Array.isArray(etablissement_ids)) {
    await supabase.from("user_etablissements").delete().eq("user_id", id);
    if (etablissement_ids.length > 0) {
      // Valider que les établissements existent et ne sont pas supprimés
      const { data: validEtabs } = await supabase
        .from("etablissements")
        .select("id")
        .in("id", etablissement_ids)
        .is("deleted_at", null);
      const validIds = (validEtabs || []).map((e) => e.id);
      if (validIds.length > 0) {
        await supabase.from("user_etablissements").insert(
          validIds.map((eid: string) => ({ user_id: id, etablissement_id: eid }))
        );
      }
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "update_user_profile",
    details: JSON.stringify({ target_id: id, updates }),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
