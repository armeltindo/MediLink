"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

interface AnalyseRow {
  id: string;
  type_analyse: string;
  statut: string;
  date_prescription: string;
  urgence: boolean | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

const statutColors: Record<string, string> = {
  prescrit: "bg-blue-100 text-blue-800",
  en_attente: "bg-yellow-100 text-yellow-800",
  en_cours: "bg-purple-100 text-purple-800",
  resultat_disponible: "bg-green-100 text-green-800",
  valide: "bg-gray-100 text-gray-700",
};

const statutLabels: Record<string, string> = {
  prescrit: "Prescrit",
  en_attente: "En attente",
  en_cours: "En cours",
  resultat_disponible: "Résultat disponible",
  valide: "Validé",
};

export default function AnalysesPage() {
  const [rows, setRows] = useState<AnalyseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("analyses_prescrites")
      .select("id, type_analyse, statut, date_prescription, urgence, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(100);

    if (filter === "pending") {
      query = query.in("statut", ["prescrit", "en_attente", "en_cours"]);
    }

    query.then(({ data }) => {
      setRows((data as unknown as AnalyseRow[]) || []);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Analyses" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border overflow-hidden">
            {(["pending", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-medical-green text-white" : "bg-background hover:bg-muted"}`}
              >
                {f === "pending" ? "En attente" : "Toutes"}
              </button>
            ))}
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {rows.length} analyse{rows.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border bg-card flex gap-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))
            : rows.map((a) => (
                <Link key={a.id} href={a.patients ? `/patients/${a.patients.npi}` : "#"} className="block">
                  <Card className={`hover:bg-accent transition-colors cursor-pointer ${a.urgence ? "border-red-300" : ""}`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-4 w-4 text-medical-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{a.type_analyse}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColors[a.statut] || "bg-gray-100 text-gray-700"}`}>
                            {statutLabels[a.statut] || a.statut}
                          </span>
                          {a.urgence && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">URGENT</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Patient : {a.patients ? `${a.patients.prenom} ${a.patients.nom}` : "—"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.date_prescription)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}

          {!loading && rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune analyse{filter === "pending" ? " en attente" : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
