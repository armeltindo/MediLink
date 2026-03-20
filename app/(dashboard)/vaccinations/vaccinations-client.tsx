"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  Syringe, Search, CheckCircle2, Clock, AlertTriangle,
  CalendarDays, User, ChevronRight, X,
} from "lucide-react";

export interface VaccinationRow {
  id: string;
  vaccin: string;
  date_vaccination: string;
  dose: string | null;
  lot: string | null;
  voie: string | null;
  statut: string | null;
  prochain_rappel: string | null;
  patients: { npi: string; nom: string; prenom: string } | null;
}

interface Props {
  rows: VaccinationRow[];
}

type TabKey = "all" | "urgent" | "en_retard";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",       label: "Toutes" },
  { key: "urgent",    label: "Rappels à venir" },
  { key: "en_retard", label: "En retard" },
];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function RappelChip({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        En retard de {Math.abs(days)} j
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
        <Clock className="h-3 w-3" />
        Rappel aujourd&apos;hui
      </span>
    );
  if (days <= 30)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <Clock className="h-3 w-3" />
        Rappel dans {days} j
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
      <CalendarDays className="h-3 w-3" />
      {formatDate(dateStr!)}
    </span>
  );
}

const STATUS_STYLE: Record<string, { border: string; icon: typeof CheckCircle2; iconClass: string }> = {
  a_jour:         { border: "border-l-green-400",  icon: CheckCircle2,  iconClass: "text-green-500" },
  en_retard:      { border: "border-l-red-400",    icon: AlertTriangle, iconClass: "text-red-500" },
  contre_indique: { border: "border-l-slate-400",  icon: AlertTriangle, iconClass: "text-slate-400" },
};

function getStyle(v: VaccinationRow) {
  const days = daysUntil(v.prochain_rappel);
  if (v.statut && STATUS_STYLE[v.statut]) return STATUS_STYLE[v.statut];
  if (days !== null && days < 0) return STATUS_STYLE.en_retard;
  return STATUS_STYLE.a_jour;
}

export function VaccinationsList({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((v) => {
      // Search filter
      if (q) {
        const patient = v.patients ? `${v.patients.prenom} ${v.patients.nom}`.toLowerCase() : "";
        if (!v.vaccin.toLowerCase().includes(q) && !patient.includes(q)) return false;
      }
      // Tab filter
      if (tab === "urgent") {
        const days = daysUntil(v.prochain_rappel);
        return days !== null && days >= 0 && days <= 30;
      }
      if (tab === "en_retard") {
        const days = daysUntil(v.prochain_rappel);
        return v.statut === "en_retard" || (days !== null && days < 0);
      }
      return true;
    });
  }, [rows, search, tab]);

  const tabCounts = useMemo(() => ({
    urgent: rows.filter((v) => {
      const days = daysUntil(v.prochain_rappel);
      return days !== null && days >= 0 && days <= 30;
    }).length,
    en_retard: rows.filter((v) => {
      const days = daysUntil(v.prochain_rappel);
      return v.statut === "en_retard" || (days !== null && days < 0);
    }).length,
  }), [rows]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Syringe className="h-7 w-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">Aucune vaccination enregistrée</p>
        <p className="text-xs mt-1.5 max-w-xs mx-auto">
          Les vaccinations sont saisies depuis le{" "}
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
          const count = key === "urgent" ? tabCounts.urgent : key === "en_retard" ? tabCounts.en_retard : rows.length;
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
                  key === "en_retard" && count > 0
                    ? "bg-red-100 text-red-700"
                    : key === "urgent" && count > 0
                    ? "bg-amber-100 text-amber-700"
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
          placeholder="Rechercher par vaccin ou patient…"
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
          ? `${filtered.length} / ${rows.length} vaccination${rows.length > 1 ? "s" : ""}`
          : `${rows.length} vaccination${rows.length > 1 ? "s" : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun résultat pour &quot;{search}&quot;</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setTab("all"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => {
            const style = getStyle(v);
            const StatusIcon = style.icon;
            return (
              <Link key={v.id} href={v.patients ? `/patients/${v.patients.npi}` : "#"} className="block group">
                <Card className={`border-l-4 ${style.border} shadow-sm hover:shadow-md transition-all group-hover:translate-x-0.5`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-0.5 p-1.5 rounded-md bg-background border shrink-0">
                      <StatusIcon className={`h-4 w-4 ${style.iconClass}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-medical-green transition-colors">
                          {v.vaccin}
                        </span>
                        {v.dose && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {v.dose}
                          </span>
                        )}
                        {v.voie && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {v.voie}
                          </span>
                        )}
                        {v.prochain_rappel && <RappelChip dateStr={v.prochain_rappel} />}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {v.patients && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {v.patients.prenom} {v.patients.nom}
                          </span>
                        )}
                        {v.lot && (
                          <span className="text-xs text-muted-foreground font-mono">
                            Lot {v.lot}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date + arrow */}
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(v.date_vaccination)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
