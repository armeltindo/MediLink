"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { FileText, ExternalLink } from "lucide-react";

interface DocumentRow {
  id: string;
  nom: string;
  type_document: string;
  date_upload: string;
  url: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

const typeLabels: Record<string, string> = {
  ordonnance: "Ordonnance",
  radio: "Radiologie",
  echographie: "Échographie",
  biologie: "Biologie",
  compte_rendu: "Compte rendu",
  autre: "Autre",
};

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("documents")
      .select("id, nom, type_document, date_upload, url, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("date_upload", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as unknown as DocumentRow[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Documents" />
      <div className="p-6 space-y-4">
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {rows.length} document{rows.length > 1 ? "s" : ""}
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
            : rows.map((d) => (
                <Card key={d.id} className="hover:bg-accent transition-colors">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-medical-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{d.nom}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {typeLabels[d.type_document] || d.type_document}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Patient :{" "}
                        <Link
                          href={d.patients ? `/patients/${d.patients.npi}` : "#"}
                          className="underline hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.patients ? `${d.patients.prenom} ${d.patients.nom}` : "—"}
                        </Link>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatDate(d.date_upload)}</span>
                      {d.url && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-medical-green hover:text-medical-green/80"
                          title="Ouvrir le document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

          {!loading && rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun document</p>
              <p className="text-sm mt-1">
                Les documents sont ajoutés depuis le{" "}
                <Link href="/patients" className="text-medical-green underline">dossier patient</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
