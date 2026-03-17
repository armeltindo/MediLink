"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Syringe } from "lucide-react";

interface VaccinationRow {
  id: string;
  vaccin: string;
  date_vaccination: string;
  dose: string | null;
  lot: string | null;
  prochain_rappel: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

export default function VaccinationsPage() {
  const [rows, setRows] = useState<VaccinationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("vaccinations")
      .select("id, vaccin, date_vaccination, dose, lot, prochain_rappel, patients(npi, nom, prenom)")
      .order("date_vaccination", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as unknown as VaccinationRow[]) || []);
        setLoading(false);
      });
  }, []);

  const needsRappel = (date: string | null) => {
    if (!date) return false;
    return new Date(date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Vaccinations" />
      <div className="p-6 space-y-4">
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {rows.length} vaccination{rows.length > 1 ? "s" : ""} enregistrée{rows.length > 1 ? "s" : ""}
          </p>
        )}

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
            : rows.map((v) => (
                <Link key={v.id} href={v.patients ? `/patients/${v.patients.npi}` : "#"} className="block">
                  <Card className={`hover:bg-accent transition-colors cursor-pointer ${needsRappel(v.prochain_rappel) ? "border-orange-300" : ""}`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                        <Syringe className="h-4 w-4 text-medical-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{v.vaccin}</span>
                          {v.dose && <span className="text-xs text-muted-foreground">Dose {v.dose}</span>}
                          {needsRappel(v.prochain_rappel) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">Rappel à prévoir</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Patient : {v.patients ? `${v.patients.prenom} ${v.patients.nom}` : "—"}
                          {v.lot && ` · Lot ${v.lot}`}
                        </p>
                        {v.prochain_rappel && (
                          <p className="text-xs text-muted-foreground">Prochain rappel : {formatDate(v.prochain_rappel)}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(v.date_vaccination)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}

          {!loading && rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Syringe className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune vaccination enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
