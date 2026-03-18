import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { BedDouble } from "lucide-react";

interface HospitalisationRow {
  id: string;
  motif_admission: string;
  date_entree: string;
  date_sortie: string | null;
  service: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

function getDuration(entree: string, sortie: string | null): string {
  const end = sortie ? new Date(sortie) : new Date();
  const days = Math.floor((end.getTime() - new Date(entree).getTime()) / (1000 * 60 * 60 * 24));
  return `${days} jour${days > 1 ? "s" : ""}`;
}

export default async function HospitalisationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter === "all" ? "all" : "current";

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

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Hospitalisations" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border overflow-hidden">
            {(["current", "all"] as const).map((f) => (
              <Link
                key={f}
                href={`/hospitalisations?filter=${f}`}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-medical-green text-white" : "bg-background hover:bg-muted"}`}
              >
                {f === "current" ? "En cours" : "Toutes"}
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {rows.length} hospitalisation{rows.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-2">
          {rows.map((h) => (
            <Link key={h.id} href={h.patients ? `/patients/${h.patients.npi}` : "#"} className="block">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                    <BedDouble className="h-4 w-4 text-medical-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {h.patients ? `${h.patients.prenom} ${h.patients.nom}` : "—"}
                      </span>
                      {!h.date_sortie && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">Hospitalisé</span>
                      )}
                      {h.service && (
                        <span className="text-xs text-muted-foreground">{h.service}</span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5">{h.motif_admission}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Durée : {getDuration(h.date_entree, h.date_sortie)}
                      {h.date_sortie ? ` · Sorti le ${formatDate(h.date_sortie)}` : " (en cours)"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Entrée {formatDate(h.date_entree)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}

          {rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune hospitalisation{filter === "current" ? " en cours" : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
