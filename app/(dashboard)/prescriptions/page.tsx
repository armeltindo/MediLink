import { createServerSupabaseClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Header } from "@/components/layout/header";
import { PrescriptionsList, type PrescriptionRow } from "./prescriptions-client";
import { cookies } from "next/headers";

export default async function PrescriptionsPage() {
  let rows: PrescriptionRow[] = [];
  let userRole: string | null = null;
  let pharmacieId: string | null = null;
  let pharmacieNom: string | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();

    // Données des prescriptions
    const { data } = await supabase
      .from("prescriptions")
      .select(`id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree,
               instructions, statut, date_prescription, date_expiration, date_dispensation,
               substitution_generique, pharmacie_id,
               patients(imu, nom, prenom),
               pharmacie:etablissements!pharmacie_id(nom)`)
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(200);

    rows = (data as unknown as PrescriptionRow[]) || [];
  }

  // Rôle de l'utilisateur connecté (via session Supabase)
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (user) {
      const { data: profile } = await supabaseAuth
        .from("users_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      userRole = profile?.role ?? null;

      if (userRole === "pharmacien") {
        // Pharmacie active : cookie selected_etablissement_id ou premier rattachement
        const cookieStore = await cookies();
        const cookieEtabId = cookieStore.get("selected_etablissement_id")?.value;

        const { data: junctions } = await supabaseAuth
          .from("user_etablissements")
          .select("etablissement_id, etablissements(id, nom, type)")
          .eq("user_id", user.id)
          .is("suspended_at", null);

        const pharmacies = (junctions ?? []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (j: any) => j.etablissements?.type === "pharmacie"
        );

        const active = cookieEtabId
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? pharmacies.find((j: any) => j.etablissement_id === cookieEtabId)
          : pharmacies[0];

        if (active) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pharmacieId = (active as any).etablissement_id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pharmacieNom = (active as any).etablissements?.nom ?? null;
        }
      }
    }
  } catch {
    // Session absente (demo ou non connecté) — pas de rôle
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Prescriptions" />
      <div className="p-6">
        <PrescriptionsList
          rows={rows}
          userRole={userRole}
          pharmacieId={pharmacieId}
          pharmacieNom={pharmacieNom}
        />
      </div>
    </div>
  );
}
