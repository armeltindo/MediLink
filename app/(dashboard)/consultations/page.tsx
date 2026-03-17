"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { Stethoscope, User } from "lucide-react";

interface ConsultationRow {
  id: string;
  date_consultation: string;
  motif: string;
  type_consultation: string | null;
  diagnostic_principal: string | null;
  diagnostic_cim10: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

const typeColors: Record<string, string> = {
  externe: "bg-blue-100 text-blue-800",
  urgence: "bg-red-100 text-red-800",
  hospitalisation: "bg-purple-100 text-purple-800",
  teleconsultation: "bg-green-100 text-green-800",
};

export default function ConsultationsPage() {
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("consultations")
      .select("id, date_consultation, motif, type_consultation, diagnostic_principal, diagnostic_cim10, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("date_consultation", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as unknown as ConsultationRow[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Consultations" />
      <div className="p-6 space-y-4">
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {rows.length} consultation{rows.length > 1 ? "s" : ""} récente{rows.length > 1 ? "s" : ""}
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
            : rows.map((c) => (
                <Link
                  key={c.id}
                  href={c.patients ? `/patients/${c.patients.npi}` : "#"}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-4 w-4 text-medical-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {c.patients ? `${c.patients.prenom} ${c.patients.nom}` : "—"}
                          </span>
                          {c.type_consultation && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[c.type_consultation] || "bg-gray-100 text-gray-800"}`}>
                              {c.type_consultation}
                            </span>
                          )}
                          {c.diagnostic_cim10 && (
                            <Badge variant="outline" className="text-xs font-mono">{c.diagnostic_cim10}</Badge>
                          )}
                        </div>
                        <p className="text-sm mt-0.5">{c.motif}</p>
                        {c.diagnostic_principal && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.diagnostic_principal}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(c.date_consultation)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}

          {!loading && rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune consultation enregistrée</p>
              <p className="text-sm mt-1">
                Les consultations sont créées depuis le{" "}
                <Link href="/patients" className="text-medical-green underline">dossier patient</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
