"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  FileText, ExternalLink, Image as ImageIcon, FileBadge,
  FileArchive, User, Calendar, Tag, File,
} from "lucide-react";

export interface DocumentRow {
  id: string;
  nom: string;
  type: string;
  uploaded_at: string;
  url: string | null;
  patients: { nip: string; nom: string; prenom: string } | null;
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
  imagerie:     { label: "Imagerie",     icon: ImageIcon,   iconBg: "bg-blue-100",    iconColor: "text-blue-600",    badgeBg: "bg-blue-100 text-blue-700",     border: "border-l-blue-500" },
  compte_rendu: { label: "Compte-rendu", icon: FileText,    iconBg: "bg-purple-100",  iconColor: "text-purple-600",  badgeBg: "bg-purple-100 text-purple-700", border: "border-l-purple-500" },
  ordonnance:   { label: "Ordonnance",   icon: FileText,    iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badgeBg: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  certificat:   { label: "Certificat",  icon: FileBadge,   iconBg: "bg-amber-100",   iconColor: "text-amber-600",   badgeBg: "bg-amber-100 text-amber-700",   border: "border-l-amber-500" },
  autre:        { label: "Autre",        icon: FileArchive, iconBg: "bg-slate-100",   iconColor: "text-slate-500",   badgeBg: "bg-slate-100 text-slate-600",   border: "border-l-slate-400" },
};

interface Props {
  rows: DocumentRow[];
}

export function DocumentsList({ rows }: Props) {
  const [selected, setSelected] = useState<DocumentRow | null>(null);

  if (rows.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="space-y-2">
        {rows.map((d) => {
          const cfg = typeConfig[d.type] ?? typeConfig.autre;
          const Icon = cfg.icon;
          return (
            <Card
              key={d.id}
              onClick={() => setSelected(d)}
              className={`border-l-4 ${cfg.border} shadow-sm hover:shadow-md transition-all cursor-pointer group hover:translate-x-0.5`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Type icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg} group-hover:opacity-90 transition-opacity`}>
                  <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                </div>

                {/* Document info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate group-hover:text-medical-green transition-colors">{d.nom}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.badgeBg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {d.patients ? `${d.patients.prenom} ${d.patients.nom}` : "Patient inconnu"}
                    </span>
                  </div>
                </div>

                {/* Date + open indicator */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(d.uploaded_at)}
                  </span>
                  <div className={`p-1.5 rounded-lg ${cfg.iconBg} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <ExternalLink className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Detail dialog ── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const cfg = typeConfig[selected.type] ?? typeConfig.autre;
            const Icon = cfg.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${cfg.iconBg}`}>
                      <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-base leading-snug break-words">{selected.nom}</DialogTitle>
                      <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded ${cfg.badgeBg}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                  {/* Patient */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Patient</p>
                      {selected.patients ? (
                        <Link
                          href={`/patients/${selected.patients.nip}`}
                          className="text-sm font-medium text-medical-green hover:underline underline-offset-2"
                          onClick={() => setSelected(null)}
                        >
                          {selected.patients.prenom} {selected.patients.nom}
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">Patient inconnu</p>
                      )}
                    </div>
                  </div>

                  {/* Type + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                      <div className="p-1.5 rounded-md bg-white border shrink-0">
                        <Tag className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Type</p>
                        <p className="text-sm font-medium mt-0.5">{cfg.label}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                      <div className="p-1.5 rounded-md bg-white border shrink-0">
                        <Calendar className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ajouté le</p>
                        <p className="text-sm font-medium mt-0.5">{formatDate(selected.uploaded_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Filename */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
                    <div className="p-1.5 rounded-md bg-white border shrink-0">
                      <File className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fichier</p>
                      <p className="text-sm font-medium mt-0.5 break-all">{selected.nom}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {selected.url ? (
                      <Button variant="medical" size="sm" className="flex-1 gap-2" asChild>
                        <a href={selected.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Ouvrir le document
                        </a>
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-2 rounded-lg border border-dashed text-xs text-muted-foreground gap-1.5">
                        <File className="h-3.5 w-3.5" />
                        Fichier non disponible
                      </div>
                    )}
                    {selected.patients && (
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href={`/patients/${selected.patients.nip}`} onClick={() => setSelected(null)}>
                          <User className="h-4 w-4" />
                          Dossier patient
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
