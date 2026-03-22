export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

// PATCH /api/prescriptions/[id]/dispenser
// Corps : { pharmacie_id: string, produit_servi?: string }
//   - pharmacie_id  : UUID de la pharmacie qui dispense
//   - produit_servi : nom du produit réellement remis (si similaire/générique)
//                     si absent ou identique au DCI, on ne note pas de substitution
//
// Règles métier appliquées ici (en complément de la RLS) :
//   1. Seul un pharmacien authentifié peut dispenser
//   2. La prescription ne doit pas être déjà dispensée ni annulée
//   3. La prescription ne doit pas être expirée
//   4. La pharmacie doit être de type 'pharmacie'
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();

  // Authentification
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Rôle
  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "pharmacien") {
    return NextResponse.json({ error: "Accès refusé — rôle pharmacien requis" }, { status: 403 });
  }

  // Corps de la requête
  const body = await req.json();
  const { pharmacie_id, produit_servi } = body as {
    pharmacie_id: string;
    produit_servi?: string;
  };

  if (!pharmacie_id) {
    return NextResponse.json({ error: "pharmacie_id requis" }, { status: 400 });
  }

  // Vérifier que l'établissement est bien une pharmacie
  const { data: etab } = await supabase
    .from("etablissements")
    .select("id, type")
    .eq("id", pharmacie_id)
    .is("deleted_at", null)
    .single();

  if (!etab || etab.type !== "pharmacie") {
    return NextResponse.json({ error: "L'établissement n'est pas une pharmacie" }, { status: 400 });
  }

  // Vérifier l'état actuel de la prescription
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, medicament_dci, statut, date_expiration")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!prescription) {
    return NextResponse.json({ error: "Prescription introuvable" }, { status: 404 });
  }
  if (prescription.statut === "dispense") {
    return NextResponse.json({ error: "Ce produit a déjà été dispensé" }, { status: 409 });
  }
  if (prescription.statut === "annule") {
    return NextResponse.json({ error: "Cette prescription est annulée" }, { status: 409 });
  }
  if (prescription.date_expiration && new Date(prescription.date_expiration) < new Date()) {
    return NextResponse.json({ error: "Cette prescription est expirée" }, { status: 409 });
  }

  // Substitution : on note uniquement si le produit servi diffère du DCI prescrit
  const substitution =
    produit_servi && produit_servi.trim().toLowerCase() !== prescription.medicament_dci.trim().toLowerCase()
      ? produit_servi.trim()
      : null;

  // Dispensation
  const { data: updated, error } = await supabase
    .from("prescriptions")
    .update({
      statut: "dispense",
      dispense_par: user.id,
      date_dispensation: new Date().toISOString(),
      pharmacie_id,
      substitution_generique: substitution,
    })
    .eq("id", params.id)
    .not("statut", "in", '("dispense","annule")')
    .select("id, statut, date_dispensation, pharmacie_id, substitution_generique")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
