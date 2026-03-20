import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { BedDouble, Clock, CalendarCheck, CalendarX, User, Stethoscope, ArrowRight, Activity } from "lucide-react";

interface HospitalisationRow {
  id: string;
  motif_admission: string;
  date_entree: string;
  date_sortie: string | null;
  service: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

function getDurationDays(entree: string, sortie: string | null): number {
  const end = sortie ? new Date(sortie) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(entree).getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDuration(days: number): string {
  if (days === 0) return "< 1 jour";
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function getInitials(prenom: string, nom: string): string {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
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
      .select("id, motif_admission, date_entree, date_sortie, service, patients(npi, nom, prenom)")
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
        <div className="space-y-2">
          {rows.map((h) => {
            const isActive = !h.date_sortie;
            const days = getDurationDays(h.date_entree, h.date_sortie);
            return (
              <Link key={h.id} href={h.patients ? `/patients/${h.patients.npi}` : "#"} className="block group">
                <Card className={`border-l-4 shadow-sm transition-all group-hover:shadow-md group-hover:translate-x-0.5 ${
                  isActive ? "border-l-emerald-500" : "border-l-slate-300"
                }`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Patient avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {h.patients
                        ? getInitials(h.patients.prenom, h.patients.nom)
                        : <User className="h-4 w-4" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1 : name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-medical-green transition-colors">
                          {h.patients ? `${h.patients.prenom} ${h.patients.nom}` : "—"}
                        </span>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En cours
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Sorti
                          </span>
                        )}

                        {h.service && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            {h.service}
                          </span>
                        )}
                      </div>

                      {/* Row 2 : motif */}
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.motif_admission}</p>

                      {/* Row 3 : dates + duration */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarCheck className="h-3 w-3 text-slate-400" />
                          Entrée {formatDate(h.date_entree)}
                        </span>
                        {h.date_sortie && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarX className="h-3 w-3 text-slate-400" />
                            Sortie {formatDate(h.date_sortie)}
                          </span>
                        )}
                        <span className={`text-xs font-medium flex items-center gap-1 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" />
                          {formatDuration(days)}{isActive ? " (en cours)" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {rows.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <BedDouble className="h-7 w-7 opacity-30" />
              </div>
              <p className="font-medium text-sm">
                Aucune hospitalisation{filter === "current" ? " en cours" : ""}
              </p>
              {filter === "current" && (
                <p className="text-xs mt-1.5">
                  <Link href="/hospitalisations?filter=all" className="text-medical-green underline underline-offset-2">
                    Voir l&apos;historique complet
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
