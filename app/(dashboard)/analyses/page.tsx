import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Header } from "@/components/layout/header";
import { AnalysesList, type AnalyseRow } from "./analyses-client";

export default async function AnalysesPage() {
  let rows: AnalyseRow[] = [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // RLS applique les droits par rôle (medecin, laborantin, infirmier…)
      const { data } = await supabase
        .from("analyses_prescrites")
        .select("id, type_analyse, statut, date_prescription, urgence, instructions, resultat_rapide, date_rendu, patients(imu, nom, prenom)")
        .is("deleted_at", null)
        .order("date_prescription", { ascending: false })
        .limit(200);

      rows = (data as unknown as AnalyseRow[]) || [];
    }
  } catch (err) {
    console.error("[analyses/page] erreur chargement:", err);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Analyses" />
      <div className="p-6">
        <AnalysesList rows={rows} />
      </div>
    </div>
  );
}
