import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { ConsultationsList, type ConsultationRow } from "./consultations-client";

export default async function ConsultationsPage() {
  let rows: ConsultationRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("consultations")
      .select(`id, date_consultation, motif, type_consultation,
               diagnostic_principal, diagnostic_cim10,
               anamnese, plan_prise_en_charge, diagnostics_differentiels,
               patients(npi, nom, prenom)`)
      .is("deleted_at", null)
      .order("date_consultation", { ascending: false })
      .limit(200);

    rows = (data as unknown as ConsultationRow[]) || [];
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Consultations" />
      <div className="p-6">
        <ConsultationsList rows={rows} />
      </div>
    </div>
  );
}
