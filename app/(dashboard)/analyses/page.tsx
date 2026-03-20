import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { AnalysesList, type AnalyseRow } from "./analyses-client";

export default async function AnalysesPage() {
  let rows: AnalyseRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("analyses_prescrites")
      .select("id, type_analyse, statut, date_prescription, urgence, instructions, resultat_rapide, date_rendu, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(200);

    rows = (data as unknown as AnalyseRow[]) || [];
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
