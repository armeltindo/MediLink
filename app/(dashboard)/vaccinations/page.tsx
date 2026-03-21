import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { VaccinationsList, VaccinationRow } from "./vaccinations-client";
import { Syringe, AlertTriangle, Clock, Users } from "lucide-react";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default async function VaccinationsPage() {
  let rows: VaccinationRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("vaccinations")
      .select("id, vaccin, date_vaccination, dose, lot, voie, statut, prochain_rappel, patients(imu, nom, prenom)")
      .order("date_vaccination", { ascending: false })
      .limit(200);
    rows = (data as unknown as VaccinationRow[]) || [];
  }

  const patientsUniques = new Set(rows.map((v) => v.patients?.imu).filter(Boolean)).size;
  const rappelsUrgents = rows.filter((v) => {
    const d = daysUntil(v.prochain_rappel);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const enRetard = rows.filter((v) => {
    const d = daysUntil(v.prochain_rappel);
    return v.statut === "en_retard" || (d !== null && d < 0);
  }).length;

  const stats = [
    { label: "Vaccinations",       value: rows.length,      icon: Syringe,       color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
    { label: "Patients vaccinés",  value: patientsUniques,  icon: Users,         color: "text-slate-600", bg: "bg-slate-50",  border: "border-slate-200" },
    { label: "Rappels dans 30 j",  value: rappelsUrgents,   icon: Clock,         color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
    { label: "Rappels en retard",  value: enRetard,         icon: AlertTriangle, color: "text-red-600",   bg: "bg-red-50",    border: "border-red-200" },
  ];

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">
      <Header title="Vaccinations" />

      {/* Identity strip */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-medical-green/10 border border-medical-green/20">
          <Syringe className="h-4 w-4 text-medical-green" />
        </div>
        <div>
          <p className="text-sm font-medium leading-none">Registre des vaccinations</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} vaccination{rows.length !== 1 ? "s" : ""} · {patientsUniques} patient{patientsUniques !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3 flex items-center gap-3`}>
                <div className={`p-2 rounded-lg bg-white border ${border} shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <VaccinationsList rows={rows} />
      </div>
    </div>
  );
}
