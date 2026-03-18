"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Pill } from "lucide-react";

interface PrescriptionRow {
  id: string;
  medicament: string;
  posologie: string | null;
  statut: string;
  date_prescription: string;
  date_expiration: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

const statutColors: Record<string, string> = {
  prescrit: "bg-blue-100 text-blue-800",
  en_cours: "bg-green-100 text-green-800",
  termine: "bg-gray-100 text-gray-700",
  annule: "bg-red-100 text-red-800",
  dispense: "bg-purple-100 text-purple-800",
};

const statutLabels: Record<string, string> = {
  prescrit: "Prescrit",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
  dispense: "Dispensé",
};

export default function PrescriptionsPage() {
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"actif" | "tout">("actif");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("prescriptions")
      .select("id, medicament, posologie, statut, date_prescription, date_expiration, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("date_prescription", { ascending: false })
      .limit(100);

    if (filter === "actif") {
      query = query.in("statut", ["prescrit", "en_cours"]);
    }

    query.then(({ data, error }) => {
      if (!error) setRows((data as unknown as PrescriptionRow[]) || []);
      setLoading(false);
    });
  }, [filter]);

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Prescriptions" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border overflow-hidden">
            {(["actif", "tout"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-medical-green text-white" : "bg-background hover:bg-muted"}`}
              >
                {f === "actif" ? "Actives" : "Toutes"}
              </button>
            ))}
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {rows.length} prescription{rows.length > 1 ? "s" : ""}
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
            : rows.map((p) => (
                <Link key={p.id} href={p.patients ? `/patients/${p.patients.npi}` : "#"} className="block">
                  <Card className={`hover:bg-accent transition-colors cursor-pointer ${isExpiringSoon(p.date_expiration) ? "border-orange-300" : ""}`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                        <Pill className="h-4 w-4 text-medical-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{p.medicament}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColors[p.statut] || "bg-gray-100 text-gray-700"}`}>
                            {statutLabels[p.statut] || p.statut}
                          </span>
                          {isExpiringSoon(p.date_expiration) && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Expire bientôt</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Patient : {p.patients ? `${p.patients.prenom} ${p.patients.nom}` : "—"}
                          {p.posologie && ` · ${p.posologie}`}
                        </p>
                        {p.date_expiration && (
                          <p className="text-xs text-muted-foreground">Expire le {formatDate(p.date_expiration)}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.date_prescription)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}

          {!loading && rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune prescription{filter === "actif" ? " active" : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
