import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { PrescriptionsList, type PrescriptionRow } from "./prescriptions-client";

export default async function PrescriptionsPage() {
  let rows: PrescriptionRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("prescriptions")
      .select(`id, medicament_dci, medicament_commercial, dosage, forme, posologie, duree,
               instructions, statut, date_prescription, date_expiration, date_dispensation,
               substitution_generique, patients(nip, nom, prenom)`)
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(200);

    rows = (data as unknown as PrescriptionRow[]) || [];
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Prescriptions" />
      <div className="p-6">
        <PrescriptionsList rows={rows} />
      </div>
    </div>
  );
}
