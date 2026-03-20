import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { BedDouble, Clock, CalendarCheck, Activity } from "lucide-react";
import { HospitalisationsList, type HospitalisationRow } from "./hospitalisations-list";

function getDurationDays(entree: string, sortie: string | null): number {
  const end = sortie ? new Date(sortie) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(entree).getTime()) / (1000 * 60 * 60 * 24)));
}

export default async function HospitalisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter === "all" ? "all" : "current";

  let rows: HospitalisationRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("hospitalisations")
      .select("id, motif, date_entree, date_sortie, service, resume_sejour, mode_sortie, patients(npi, nom, prenom), etablissements(nom)")
      .is("deleted_at", null)
      .order("date_entree", { ascending: false })
      .limit(100);

    if (filter === "current") {
      query = query.is("date_sortie", null);
    }

    const { data } = await query;
    rows = (data as unknown as HospitalisationRow[]) || [];
  }

  // Stats
  const enCoursCount  = rows.filter((h) => !h.date_sortie).length;
  const sortiesCount  = rows.filter((h) => !!h.date_sortie).length;
  const durations     = rows.map((h) => getDurationDays(h.date_entree, h.date_sortie));
  const avgDays       = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const maxDays       = durations.length > 0 ? Math.max(...durations) : 0;

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">
      <Header title="Hospitalisations" />

      {/* ── Identity strip ── */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <BedDouble className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Hospitalisations</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filter === "current" ? "Patients actuellement hospitalisés" : "Historique complet des hospitalisations"}
            </p>
          </div>
        </div>

        {/* Filter toggle */}
        <div className="flex rounded-lg border overflow-hidden shadow-sm text-sm">
          {(["current", "all"] as const).map((f) => (
            <Link
              key={f}
              href={`/hospitalisations?filter=${f}`}
              className={`px-4 py-1.5 font-medium transition-colors ${
                filter === f
                  ? "bg-medical-green text-white"
                  : "bg-white text-muted-foreground hover:bg-slate-50"
              }`}
            >
              {f === "current" ? "En cours" : "Toutes"}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* ── Mini stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: filter === "current" ? "En cours" : "Affichées",
              value: rows.length,
              icon: BedDouble,
              iconBg: "bg-emerald-100", iconColor: "text-emerald-600", border: "border-l-emerald-500",
            },
            {
              label: "En cours",
              value: filter === "current" ? rows.length : enCoursCount,
              icon: Activity,
              iconBg: "bg-red-100", iconColor: "text-red-500", border: "border-l-red-500",
            },
            {
              label: "Durée moyenne",
              value: `${avgDays}j`,
              icon: Clock,
              iconBg: "bg-blue-100", iconColor: "text-blue-600", border: "border-l-blue-500",
            },
            {
              label: "Séjour le plus long",
              value: `${maxDays}j`,
              icon: CalendarCheck,
              iconBg: "bg-purple-100", iconColor: "text-purple-600", border: "border-l-purple-500",
            },
          ].map(({ label, value, icon: Icon, iconBg, iconColor, border }) => (
            <Card key={label} className={`border-l-4 ${border} shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Count label ── */}
        {rows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {rows.length} hospitalisation{rows.length > 1 ? "s" : ""}
            {filter === "all" && sortiesCount > 0 && ` · ${sortiesCount} sortie${sortiesCount > 1 ? "s" : ""}`}
          </p>
        )}

        {/* ── List ── */}
        <HospitalisationsList rows={rows} filter={filter} />
      </div>
    </div>
  );
}
