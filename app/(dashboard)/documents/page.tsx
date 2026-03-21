import { createServerSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { DocumentsList, DocumentRow } from "./documents-client";
import { File } from "lucide-react";
import {
  FileText, Image as ImageIcon, FileBadge, FileArchive,
} from "lucide-react";

type IconType = typeof FileText;

const typeConfig: Record<string, { label: string; icon: IconType; badgeBg: string }> = {
  imagerie:     { label: "Imagerie",     icon: ImageIcon,   badgeBg: "bg-blue-100 text-blue-700" },
  compte_rendu: { label: "Compte-rendu", icon: FileText,    badgeBg: "bg-purple-100 text-purple-700" },
  ordonnance:   { label: "Ordonnance",   icon: FileText,    badgeBg: "bg-emerald-100 text-emerald-700" },
  certificat:   { label: "Certificat",  icon: FileBadge,   badgeBg: "bg-amber-100 text-amber-700" },
  autre:        { label: "Autre",        icon: FileArchive, badgeBg: "bg-slate-100 text-slate-600" },
};

const typeOrder = ["imagerie", "compte_rendu", "ordonnance", "certificat", "autre"];

export default async function DocumentsPage() {
  let rows: DocumentRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("documents")
      .select("id, nom, type, uploaded_at, url, patients(imu, nom, prenom)")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(100);
    rows = (data as unknown as DocumentRow[]) || [];
  }

  const countByType = rows.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

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
              {rows.length} document{rows.length !== 1 ? "s" : ""} · Cliquer sur une ligne pour voir les détails
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
        <DocumentsList rows={rows} />
      </div>
    </div>
  );
}
