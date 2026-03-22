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

// GET /api/prescriptions/[id]/dispensations
// Retourne l'historique des dispensations partielles pour une prescription.
// Accessible aux rôles : medecin, pharmacien, admin_etablissement, super_admin.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowed = ["super_admin", "admin_etablissement", "medecin", "pharmacien", "infirmier"];
  if (!profile || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Vérifier que la prescription existe
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, quantite, unite, medicament_dci")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!prescription) {
    return NextResponse.json({ error: "Prescription introuvable" }, { status: 404 });
  }

  // Historique des dispensations
  const { data: dispensations, error } = await supabase
    .from("prescription_dispensations")
    .select(`
      id,
      quantite,
      substitution_generique,
      date_dispensation,
      pharmacie:etablissements!pharmacie_id(id, nom),
      dispensateur:users_profiles!dispense_par(id, nom, prenom)
    `)
    .eq("prescription_id", params.id)
    .order("date_dispensation", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total_dispense = (dispensations ?? []).reduce((sum, d) => sum + d.quantite, 0);

  return NextResponse.json({
    prescription_id: params.id,
    medicament_dci: prescription.medicament_dci,
    quantite_prescrite: prescription.quantite,
    unite: prescription.unite,
    total_dispense,
    restant: prescription.quantite !== null ? prescription.quantite - total_dispense : null,
    dispensations: dispensations ?? [],
  });
}
