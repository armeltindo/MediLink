import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileText, ExternalLink, Image as ImageIcon } from "lucide-react";

interface DocumentRow {
  id: string;
  nom: string;
  type: string;
  uploaded_at: string;
  url: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

type IconType = typeof FileText;

const typeConfig: Record<string, { label: string; icon: IconType }> = {
  imagerie:     { label: "Imagerie",      icon: ImageIcon },
  compte_rendu: { label: "Compte-rendu",  icon: FileText },
  ordonnance:   { label: "Ordonnance",    icon: FileText },
  certificat:   { label: "Certificat",    icon: FileText },
  autre:        { label: "Autre",         icon: FileText },
};

export default async function DocumentsPage() {
  let rows: DocumentRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("documents")
      .select("id, nom, type, uploaded_at, url, patients(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(100);
    rows = (data as unknown as DocumentRow[]) || [];
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Documents" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          {rows.length} document{rows.length > 1 ? "s" : ""}
        </p>

        <div className="space-y-2">
          {rows.map((d) => {
            const config = typeConfig[d.type] ?? typeConfig.autre;
            const Icon = config.icon;
            return (
              <Card key={d.id} className="hover:bg-accent transition-colors">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="h-9 w-9 rounded-full bg-medical-green/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-medical-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{d.nom}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Patient :{" "}
                      <Link
                        href={d.patients ? `/patients/${d.patients.npi}` : "#"}
                        className="underline hover:text-foreground"
                      >
                        {d.patients ? `${d.patients.prenom} ${d.patients.nom}` : "—"}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDate(d.uploaded_at)}</span>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-medical-green hover:text-medical-green/80"
                        title="Ouvrir le document"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {rows.length === 0 && (
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
