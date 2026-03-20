import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileText, ExternalLink, Image as ImageIcon, FileBadge, File, FileArchive, User } from "lucide-react";

interface DocumentRow {
  id: string;
  nom: string;
  type: string;
  uploaded_at: string;
  url: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

type IconType = typeof FileText;

const typeConfig: Record<string, {
  label: string;
  icon: IconType;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  border: string;
}> = {
  imagerie:     { label: "Imagerie",     icon: ImageIcon,   iconBg: "bg-blue-100",    iconColor: "text-blue-600",    badgeBg: "bg-blue-100 text-blue-700",    border: "border-l-blue-500" },
  compte_rendu: { label: "Compte-rendu", icon: FileText,    iconBg: "bg-purple-100",  iconColor: "text-purple-600",  badgeBg: "bg-purple-100 text-purple-700",border: "border-l-purple-500" },
  ordonnance:   { label: "Ordonnance",   icon: FileText,    iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badgeBg: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  certificat:   { label: "Certificat",  icon: FileBadge,   iconBg: "bg-amber-100",   iconColor: "text-amber-600",   badgeBg: "bg-amber-100 text-amber-700",  border: "border-l-amber-500" },
  autre:        { label: "Autre",        icon: FileArchive, iconBg: "bg-slate-100",   iconColor: "text-slate-500",   badgeBg: "bg-slate-100 text-slate-600",  border: "border-l-slate-400" },
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

  // Count by type for summary chips
  const countByType = rows.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  const typeOrder = ["imagerie", "compte_rendu", "ordonnance", "certificat", "autre"];

  return (
    <div className="flex flex-col min-h-full bg-slate-50/40">
      <Header title="Documents" />

      {/* ── Identity strip ── */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <File className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Documents médicaux</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rows.length} document{rows.length !== 1 ? "s" : ""} · Triés par date d&apos;ajout décroissante
            </p>
          </div>
        </div>

        {/* Type summary chips */}
        {rows.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {typeOrder.filter((t) => countByType[t]).map((t) => {
              const cfg = typeConfig[t] ?? typeConfig.autre;
              return (
                <span key={t} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label} · {countByType[t]}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 opacity-30" />
            </div>
            <p className="font-medium text-sm">Aucun document</p>
            <p className="text-xs mt-1.5 max-w-xs mx-auto">
              Les documents sont ajoutés depuis le{" "}
              <Link href="/patients" className="text-medical-green underline underline-offset-2">
                dossier patient
              </Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((d) => {
              const cfg = typeConfig[d.type] ?? typeConfig.autre;
              const Icon = cfg.icon;
              return (
                <Card
                  key={d.id}
                  className={`border-l-4 ${cfg.border} shadow-sm hover:shadow-md transition-shadow group`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Type icon */}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg} group-hover:opacity-90 transition-opacity`}>
                      <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>

                    {/* Document info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{d.nom}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.badgeBg}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Link
                          href={d.patients ? `/patients/${d.patients.npi}` : "#"}
                          className="text-xs text-muted-foreground hover:text-medical-green hover:underline underline-offset-2 transition-colors truncate"
                        >
                          {d.patients ? `${d.patients.prenom} ${d.patients.nom}` : "Patient inconnu"}
                        </Link>
                      </div>
                    </div>

                    {/* Date + open link */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(d.uploaded_at)}
                      </span>
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ouvrir le document"
                          className={`p-1.5 rounded-lg transition-colors ${cfg.iconBg} ${cfg.iconColor} hover:opacity-80`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
