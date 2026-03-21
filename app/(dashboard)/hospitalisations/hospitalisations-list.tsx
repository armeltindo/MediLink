"use client";
import Link from "next/link";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  BedDouble, Clock, CalendarCheck, CalendarX, User, Stethoscope,
  ArrowRight, X, ExternalLink, Building2, FileText, Activity,
  CheckCircle2, AlertTriangle, Home, Shuffle,
} from "lucide-react";

export interface HospitalisationRow {
  id: string;
  motif: string;
  date_entree: string;
  date_sortie: string | null;
  service: string | null;
  resume_sejour: string | null;
  mode_sortie: string | null;
  patients: { nip: string; nom: string; prenom: string } | null;
  etablissements: { nom: string } | null;
}

function getDurationDays(entree: string, sortie: string | null): number {
  const end = sortie ? new Date(sortie) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(entree).getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDuration(days: number): string {
  if (days === 0) return "< 1 jour";
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function getInitials(prenom: string, nom: string): string {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
}

const MODE_SORTIE = {
  domicile: { label: "Retour à domicile", icon: Home,          color: "text-emerald-700", bg: "bg-emerald-100" },
  transfert: { label: "Transfert",         icon: Shuffle,        color: "text-blue-700",    bg: "bg-blue-100"    },
  deces:     { label: "Décès",             icon: AlertTriangle,  color: "text-red-700",     bg: "bg-red-100"     },
  fugue:     { label: "Fugue",             icon: Activity,       color: "text-amber-700",   bg: "bg-amber-100"   },
} as const;

// ─── Detail slide-over ────────────────────────────────────────────────────────

function DetailPanel({ h, onClose }: { h: HospitalisationRow; onClose: () => void }) {
  const isActive  = !h.date_sortie;
  const days      = getDurationDays(h.date_entree, h.date_sortie);
  const modeSortie = h.mode_sortie ? MODE_SORTIE[h.mode_sortie as keyof typeof MODE_SORTIE] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={cn(
          "flex items-start gap-3 px-5 py-4 border-b",
          isActive ? "bg-emerald-50/60" : "bg-slate-50/60"
        )}>
          {/* Avatar */}
          <div className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          )}>
            {h.patients ? getInitials(h.patients.prenom, h.patients.nom) : <User className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 leading-tight">
              {h.patients ? `${h.patients.prenom} ${h.patients.nom}` : "Patient inconnu"}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En cours
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Terminée
                </span>
              )}
              {h.service && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  <Stethoscope className="h-3 w-3" />
                  {h.service}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Durée + dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-slate-50 px-3 py-3 text-center">
              <p className={cn("text-xl font-bold", isActive ? "text-emerald-600" : "text-slate-700")}>
                {days}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                jour{days > 1 ? "s" : ""}{isActive ? " (en cours)" : ""}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border bg-slate-50 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <CalendarCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-muted-foreground">Entrée :</span>
                <span className="font-medium text-slate-800">{formatDate(h.date_entree)}</span>
              </div>
              {h.date_sortie ? (
                <div className="flex items-center gap-2 text-xs">
                  <CalendarX className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-muted-foreground">Sortie :</span>
                  <span className="font-medium text-slate-800">{formatDate(h.date_sortie)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 font-medium">Hospitalisé depuis {formatDuration(days)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Motif d&apos;admission</p>
            <div className="rounded-xl border bg-slate-50 px-3.5 py-3">
              <p className="text-sm text-slate-700 leading-relaxed">{h.motif}</p>
            </div>
          </div>

          {/* Établissement */}
          {h.etablissements?.nom && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Établissement</p>
              <div className="flex items-center gap-2.5 rounded-xl border bg-slate-50 px-3.5 py-3">
                <div className="p-1.5 rounded-lg bg-blue-100 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">{h.etablissements.nom}</p>
              </div>
            </div>
          )}

          {/* Résumé du séjour */}
          {h.resume_sejour && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Résumé du séjour</p>
              <div className="flex gap-2.5 rounded-xl border bg-slate-50 px-3.5 py-3">
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">{h.resume_sejour}</p>
              </div>
            </div>
          )}

          {/* Mode de sortie */}
          {modeSortie && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Mode de sortie</p>
              <div className={cn("flex items-center gap-2.5 rounded-xl border px-3.5 py-3", modeSortie.bg)}>
                <modeSortie.icon className={cn("h-4 w-4 shrink-0", modeSortie.color)} />
                <p className={cn("text-sm font-medium", modeSortie.color)}>{modeSortie.label}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {h.patients && (
          <div className="border-t p-4">
            <Link
              href={`/patients/${h.patients.nip}?tab=hospitalisations`}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-medical-green text-white text-sm font-medium py-2.5 hover:bg-medical-green/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Voir le dossier complet
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function HospitalisationsList({
  rows,
  filter,
}: {
  rows: HospitalisationRow[];
  filter: "current" | "all";
}) {
  const [selected, setSelected] = useState<HospitalisationRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <BedDouble className="h-7 w-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">
          Aucune hospitalisation{filter === "current" ? " en cours" : ""}
        </p>
        {filter === "current" && (
          <p className="text-xs mt-1.5">
            <Link href="/hospitalisations?filter=all" className="text-medical-green underline underline-offset-2">
              Voir l&apos;historique complet
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {rows.map((h) => {
          const isActive  = !h.date_sortie;
          const days      = getDurationDays(h.date_entree, h.date_sortie);
          const isSelected = selected?.id === h.id;

          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelected(isSelected ? null : h)}
              className="block w-full text-left group"
            >
              <Card className={cn(
                "border-l-4 shadow-sm transition-all duration-150",
                isActive ? "border-l-emerald-500" : "border-l-slate-300",
                isSelected
                  ? "ring-2 ring-medical-green/40 shadow-md"
                  : "hover:shadow-md hover:translate-x-0.5"
              )}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm",
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {h.patients
                      ? getInitials(h.patients.prenom, h.patients.nom)
                      : <User className="h-4 w-4" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-semibold text-sm transition-colors",
                        isSelected ? "text-medical-green" : "group-hover:text-medical-green"
                      )}>
                        {h.patients ? `${h.patients.prenom} ${h.patients.nom}` : "—"}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En cours
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Sorti
                        </span>
                      )}
                      {h.service && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {h.service}
                        </span>
                      )}
                    </div>

                    {/* Row 2 : motif */}
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.motif}</p>

                    {/* Row 3 : dates */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3 text-slate-400" />
                        Entrée {formatDate(h.date_entree)}
                      </span>
                      {h.date_sortie && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarX className="h-3 w-3 text-slate-400" />
                          Sortie {formatDate(h.date_sortie)}
                        </span>
                      )}
                      <span className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        isActive ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        <Clock className="h-3 w-3" />
                        {formatDuration(days)}{isActive ? " (en cours)" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Arrow / chevron */}
                  <ArrowRight className={cn(
                    "h-4 w-4 shrink-0 transition-all",
                    isSelected
                      ? "text-medical-green opacity-100 rotate-180"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  )} />
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Slide-over */}
      {selected && <DetailPanel h={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
