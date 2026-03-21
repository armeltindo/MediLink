"use client";
import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  FlaskConical, Search, X, ChevronRight, User, CalendarDays,
  AlertTriangle, Clock, CheckCircle2, FileText, Stethoscope,
  ClipboardList, CalendarCheck,
} from "lucide-react";

export interface AnalyseRow {
  id: string;
  type_analyse: string;
  statut: string;
  date_prescription: string;
  urgence: boolean | null;
  instructions: string | null;
  resultat_rapide: string | null;
  date_rendu: string | null;
  patients: { nip: string; nom: string; prenom: string } | null;
}

interface Props {
  rows: AnalyseRow[];
}

type TabKey = "en_cours" | "rendu" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "en_cours", label: "En cours" },
  { key: "rendu",    label: "Rendus" },
  { key: "all",      label: "Toutes" },
];

const STATUT_STYLE: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof FlaskConical; iconClass: string }> = {
  prescrit:  { label: "Prescrit",            bg: "bg-blue-100",   text: "text-blue-800",  border: "border-l-blue-400",   icon: FileText,      iconClass: "text-blue-500" },
  en_attente:{ label: "En attente",          bg: "bg-yellow-100", text: "text-yellow-800",border: "border-l-yellow-400", icon: Clock,         iconClass: "text-yellow-500" },
  en_cours:  { label: "En cours",            bg: "bg-purple-100", text: "text-purple-800",border: "border-l-purple-400", icon: FlaskConical,  iconClass: "text-purple-500" },
  rendu:     { label: "Résultat disponible", bg: "bg-green-100",  text: "text-green-800", border: "border-l-green-400",  icon: CheckCircle2,  iconClass: "text-green-500" },
  annule:    { label: "Annulé",              bg: "bg-gray-100",   text: "text-gray-600",  border: "border-l-gray-300",   icon: X,             iconClass: "text-gray-400" },
};

function getStatutStyle(statut: string) {
  return STATUT_STYLE[statut] ?? STATUT_STYLE.prescrit;
}

/* ── Detail dialog ──────────────────────────────────────────────────── */
function DetailDialog({ a, onClose }: { a: AnalyseRow; onClose: () => void }) {
  const s = getStatutStyle(a.statut);
  const StatusIcon = s.icon;

  const fields: { icon: typeof User; label: string; value: ReactNode }[] = [
    {
      icon: User,
      label: "Patient",
      value: a.patients ? (
        <Link
          href={`/patients/${a.patients.nip}`}
          className="text-sm font-medium text-medical-green hover:underline underline-offset-2"
          onClick={onClose}
        >
          {a.patients.prenom} {a.patients.nom}
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
    },
    {
      icon: CalendarDays,
      label: "Date de prescription",
      value: <span className="text-sm font-medium">{formatDate(a.date_prescription)}</span>,
    },
    ...(a.date_rendu ? [{
      icon: CalendarCheck,
      label: "Date de rendu",
      value: <span className="text-sm font-medium">{formatDate(a.date_rendu)}</span>,
    }] : []),
    ...(a.instructions ? [{
      icon: ClipboardList,
      label: "Instructions",
      value: <p className="text-sm text-foreground whitespace-pre-wrap">{a.instructions}</p>,
    }] : []),
    ...(a.resultat_rapide ? [{
      icon: FileText,
      label: "Résultat rapide",
      value: <p className="text-sm text-foreground whitespace-pre-wrap">{a.resultat_rapide}</p>,
    }] : []),
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg border shrink-0 bg-background border-l-4 ${s.border}`}>
              <StatusIcon className={`h-5 w-5 ${s.iconClass}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base leading-snug">{a.type_analyse}</DialogTitle>
                {a.urgence && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    URGENT
                  </span>
                )}
              </div>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                {s.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border">
              <div className="p-1.5 rounded-md bg-white border shrink-0">
                <Icon className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <div className="mt-0.5">{value}</div>
              </div>
            </div>
          ))}

          {a.urgence && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="p-1.5 rounded-md bg-white border border-red-200 shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Analyse urgente</p>
                <p className="text-xs text-red-600 mt-0.5">Cette analyse requiert un traitement prioritaire.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {a.patients && (
            <Button variant="medical" size="sm" className="flex-1 gap-2" asChild>
              <Link href={`/patients/${a.patients.nip}`} onClick={onClose}>
                <Stethoscope className="h-4 w-4" />
                Dossier patient
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={onClose}>
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main list ──────────────────────────────────────────────────────── */
export function AnalysesList({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("en_cours");
  const [selected, setSelected] = useState<AnalyseRow | null>(null);

  const tabCounts = useMemo(() => ({
    en_cours: rows.filter((a) => ["prescrit", "en_attente", "en_cours"].includes(a.statut)).length,
    rendu:    rows.filter((a) => a.statut === "rendu").length,
    all:      rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (q) {
        const patient = a.patients ? `${a.patients.prenom} ${a.patients.nom}`.toLowerCase() : "";
        if (!a.type_analyse.toLowerCase().includes(q) && !patient.includes(q)) return false;
      }
      if (tab === "en_cours") return ["prescrit", "en_attente", "en_cours"].includes(a.statut);
      if (tab === "rendu")    return a.statut === "rendu";
      return true;
    });
  }, [rows, search, tab]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FlaskConical className="h-7 w-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">Aucune analyse enregistrée</p>
        <p className="text-xs mt-1.5 max-w-xs mx-auto">
          Les analyses sont prescrites depuis le{" "}
          <Link href="/patients" className="text-medical-green underline underline-offset-2">
            dossier patient
          </Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map(({ key, label }) => {
          const count = tabCounts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                tab === key
                  ? "border-medical-green text-medical-green"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  key === "en_cours" && count > 0
                    ? "bg-purple-100 text-purple-700"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par type d'analyse ou patient…"
          className="pl-9 pr-9 h-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length !== rows.length
          ? `${filtered.length} / ${rows.length} analyse${rows.length > 1 ? "s" : ""}`
          : `${rows.length} analyse${rows.length > 1 ? "s" : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun résultat{search ? ` pour "${search}"` : ""}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setTab("en_cours"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const s = getStatutStyle(a.statut);
            const StatusIcon = s.icon;
            return (
              <button
                key={a.id}
                type="button"
                className="w-full text-left group"
                onClick={() => setSelected(a)}
              >
                <Card className={`border-l-4 ${s.border} shadow-sm hover:shadow-md transition-all group-hover:translate-x-0.5 ${a.urgence ? "ring-1 ring-red-200" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5 p-1.5 rounded-md bg-background border shrink-0">
                      <StatusIcon className={`h-4 w-4 ${s.iconClass}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-medical-green transition-colors">
                          {a.type_analyse}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                        {a.urgence && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            URGENT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {a.patients && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {a.patients.prenom} {a.patients.nom}
                          </span>
                        )}
                        {a.resultat_rapide && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Résultat saisi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date + arrow */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(a.date_prescription)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {selected && <DetailDialog a={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
