"use client";
import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Stethoscope, Search, X, ChevronRight, User, CalendarDays,
  AlertTriangle, Monitor, Building2, Video, ClipboardList,
  FileText, GitBranch, BookOpen,
} from "lucide-react";

export interface ConsultationRow {
  id: string;
  date_consultation: string;
  motif: string;
  type_consultation: string | null;
  diagnostic_principal: string | null;
  diagnostic_cim10: string | null;
  anamnese: string | null;
  plan_prise_en_charge: string | null;
  diagnostics_differentiels: string[] | null;
  patients: { imu: string; nom: string; prenom: string } | null;
}

interface Props {
  rows: ConsultationRow[];
}

type TabKey = "all" | "urgence" | "teleconsultation";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",             label: "Toutes" },
  { key: "urgence",         label: "Urgences" },
  { key: "teleconsultation",label: "Téléconsultations" },
];

const TYPE_STYLE: Record<string, {
  label: string; bg: string; text: string;
  border: string; icon: typeof Stethoscope; iconClass: string;
}> = {
  externe:          { label: "Externe",          bg: "bg-blue-100",   text: "text-blue-800",   border: "border-l-blue-400",   icon: Building2,   iconClass: "text-blue-500" },
  urgence:          { label: "Urgence",           bg: "bg-red-100",    text: "text-red-800",    border: "border-l-red-400",    icon: AlertTriangle,iconClass: "text-red-500" },
  hospitalisation:  { label: "Hospitalisation",   bg: "bg-purple-100", text: "text-purple-800", border: "border-l-purple-400", icon: Building2,   iconClass: "text-purple-500" },
  teleconsultation: { label: "Téléconsultation",  bg: "bg-green-100",  text: "text-green-800",  border: "border-l-green-400",  icon: Video,       iconClass: "text-green-500" },
};

const DEFAULT_STYLE = { label: "Consultation", bg: "bg-slate-100", text: "text-slate-700", border: "border-l-slate-300", icon: Stethoscope, iconClass: "text-slate-500" };

function getStyle(type: string | null) {
  return (type && TYPE_STYLE[type]) ? TYPE_STYLE[type] : DEFAULT_STYLE;
}

/* ── Detail dialog ──────────────────────────────────────────────────── */
function DetailDialog({ c, onClose }: { c: ConsultationRow; onClose: () => void }) {
  const s = getStyle(c.type_consultation);
  const TypeIcon = s.icon;

  const fields: { icon: typeof User; label: string; value: ReactNode }[] = [
    {
      icon: User,
      label: "Patient",
      value: c.patients ? (
        <Link
          href={`/patients/${c.patients.imu}`}
          className="text-sm font-medium text-medical-green hover:underline underline-offset-2"
          onClick={onClose}
        >
          {c.patients.prenom} {c.patients.nom}
        </Link>
      ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      icon: CalendarDays,
      label: "Date",
      value: <span className="text-sm font-medium">{formatDateTime(c.date_consultation)}</span>,
    },
    {
      icon: ClipboardList,
      label: "Motif",
      value: <p className="text-sm font-medium">{c.motif}</p>,
    },
    ...(c.anamnese ? [{
      icon: BookOpen,
      label: "Anamnèse",
      value: <p className="text-sm text-foreground whitespace-pre-wrap">{c.anamnese}</p>,
    }] : []),
    ...(c.diagnostic_principal ? [{
      icon: FileText,
      label: "Diagnostic principal",
      value: (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{c.diagnostic_principal}</p>
          {c.diagnostic_cim10 && (
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border">{c.diagnostic_cim10}</span>
          )}
        </div>
      ),
    }] : []),
    ...(c.diagnostics_differentiels && c.diagnostics_differentiels.length > 0 ? [{
      icon: GitBranch,
      label: "Diagnostics différentiels",
      value: (
        <ul className="space-y-1">
          {c.diagnostics_differentiels.map((d, i) => (
            <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      ),
    }] : []),
    ...(c.plan_prise_en_charge ? [{
      icon: Monitor,
      label: "Plan de prise en charge",
      value: <p className="text-sm text-foreground whitespace-pre-wrap">{c.plan_prise_en_charge}</p>,
    }] : []),
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg border shrink-0 bg-background border-l-4 ${s.border}`}>
              <TypeIcon className={`h-5 w-5 ${s.iconClass}`} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base leading-snug">
                {c.patients ? `${c.patients.prenom} ${c.patients.nom}` : "—"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {c.type_consultation && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(c.date_consultation)}</span>
              </div>
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
        </div>

        <div className="flex gap-2 pt-2">
          {c.patients && (
            <Button variant="medical" size="sm" className="flex-1 gap-2" asChild>
              <Link href={`/patients/${c.patients.imu}`} onClick={onClose}>
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
export function ConsultationsList({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [selected, setSelected] = useState<ConsultationRow | null>(null);

  const tabCounts = useMemo(() => ({
    urgence:          rows.filter((c) => c.type_consultation === "urgence").length,
    teleconsultation: rows.filter((c) => c.type_consultation === "teleconsultation").length,
    all:              rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      if (q) {
        const patient = c.patients ? `${c.patients.prenom} ${c.patients.nom}`.toLowerCase() : "";
        const text = `${c.motif} ${c.diagnostic_principal ?? ""}`.toLowerCase();
        if (!text.includes(q) && !patient.includes(q)) return false;
      }
      if (tab === "urgence")          return c.type_consultation === "urgence";
      if (tab === "teleconsultation") return c.type_consultation === "teleconsultation";
      return true;
    });
  }, [rows, search, tab]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Stethoscope className="h-7 w-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">Aucune consultation enregistrée</p>
        <p className="text-xs mt-1.5 max-w-xs mx-auto">
          Les consultations sont créées depuis le{" "}
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
          const count = tabCounts[key as keyof typeof tabCounts];
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
                  key === "urgence"
                    ? "bg-red-100 text-red-700"
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
          placeholder="Rechercher par patient, motif ou diagnostic…"
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
          ? `${filtered.length} / ${rows.length} consultation${rows.length > 1 ? "s" : ""}`
          : `${rows.length} consultation${rows.length > 1 ? "s" : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun résultat{search ? ` pour "${search}"` : ""}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setTab("all"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const s = getStyle(c.type_consultation);
            const TypeIcon = s.icon;
            return (
              <button
                key={c.id}
                type="button"
                className="w-full text-left group"
                onClick={() => setSelected(c)}
              >
                <Card className={`border-l-4 ${s.border} shadow-sm hover:shadow-md transition-all group-hover:translate-x-0.5`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5 p-1.5 rounded-md bg-background border shrink-0">
                      <TypeIcon className={`h-4 w-4 ${s.iconClass}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-medical-green transition-colors">
                          {c.patients ? `${c.patients.prenom} ${c.patients.nom}` : "—"}
                        </span>
                        {c.type_consultation && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                            {s.label}
                          </span>
                        )}
                        {c.diagnostic_cim10 && (
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border text-muted-foreground">
                            {c.diagnostic_cim10}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-foreground/80">{c.motif}</p>

                      {c.diagnostic_principal && (
                        <p className="text-xs text-muted-foreground truncate">{c.diagnostic_principal}</p>
                      )}
                    </div>

                    {/* Date + arrow */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums text-right">
                        {formatDateTime(c.date_consultation)}
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

      {selected && <DetailDialog c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
