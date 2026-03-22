"use client";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, MapPin, Phone, Mail, Search, X,
  Hospital, Stethoscope, FlaskConical, Pill, Landmark,
  Calendar, ExternalLink, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EtablissementRow {
  id: string;
  nom: string;
  type: string | null;
  ville: string;
  region: string;
  pays: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  logo_url: string | null;
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  CHU:      { label: "CHU",            color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: Landmark     },
  CSP:      { label: "CSP",            color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: Hospital     },
  clinique:     { label: "Clinique",       color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",    icon: Stethoscope  },
  polyclinique: { label: "Polyclinique",  color: "text-cyan-700",   bg: "bg-cyan-50",    border: "border-cyan-200",    icon: Stethoscope  },
  hopital:      { label: "Hôpital",       color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200",  icon: Hospital     },
  cabinet:      { label: "Cabinet médical",color: "text-violet-700",bg: "bg-violet-50",  border: "border-violet-200",  icon: Pill         },
  pharmacie:    { label: "Pharmacie",     color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",   icon: Pill         },
  labo:     { label: "Laboratoire",    color: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-200",   icon: FlaskConical },
  autre:    { label: "Autre",          color: "text-gray-600",   bg: "bg-gray-50",   border: "border-gray-200",   icon: Building2    },
};

function getConfig(type: string | null) {
  return TYPE_CONFIG[type ?? ""] ?? TYPE_CONFIG.autre;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ rows, activeType, onType }: {
  rows: EtablissementRow[];
  activeType: string;
  onType: (t: string) => void;
}) {
  const total = rows.length;
  const typeCounts = rows.reduce((acc, e) => {
    const k = e.type ?? "autre";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onType("all")}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
          activeType === "all"
            ? "bg-foreground text-background border-foreground"
            : "bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        Tous
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeType === "all" ? "bg-background/20" : "bg-muted"}`}>
          {total}
        </span>
      </button>
      {Object.entries(typeCounts).map(([type, count]) => {
        const cfg = getConfig(type);
        const Icon = cfg.icon;
        const isActive = activeType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onType(isActive ? "all" : type)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
              isActive
                ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-current/30`
                : `bg-background border-border hover:${cfg.bg} hover:${cfg.color} text-muted-foreground`
            }`}
          >
            <Icon className="h-3 w-3" />
            {cfg.label}
            <span className="font-bold">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Etablissement Detail Dialog ──────────────────────────────────────────────

function EtablissementDetail({ e, open, onClose }: {
  e: EtablissementRow;
  open: boolean;
  onClose: () => void;
}) {
  const cfg = getConfig(e.type);
  const Icon = cfg.icon;
  const fullAddress = [e.adresse, e.ville, e.region, e.pays].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{e.nom}</DialogTitle>
        </DialogHeader>

        {/* Header band */}
        <div className={`-mx-6 -mt-6 px-6 pt-6 pb-5 ${cfg.bg} border-b ${cfg.border}`}>
          <div className="flex items-center gap-4">
            {e.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.logo_url}
                alt={e.nom}
                className="h-16 w-16 rounded-xl object-contain border bg-white shrink-0 shadow-sm"
              />
            ) : (
              <div className={`h-16 w-16 rounded-xl flex items-center justify-center shrink-0 border bg-white shadow-sm ${cfg.border}`}>
                <Icon className={`h-8 w-8 ${cfg.color}`} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-base leading-tight">{e.nom}</h2>
              {e.type && (
                <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.color} ${cfg.border} bg-white/60`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 pt-1">

          {/* Localisation */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Localisation</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                {e.adresse && <p className="font-medium">{e.adresse}</p>}
                <p className="text-muted-foreground">{[e.ville, e.region, e.pays].filter(Boolean).join(", ")}</p>
              </div>
            </div>
            {fullAddress && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-medical-blue hover:underline mt-1 ml-6"
              >
                Voir sur la carte
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Contact */}
          {(e.telephone || e.email) && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Contact</p>
              <div className="space-y-2">
                {e.telephone && (
                  <a
                    href={`tel:${e.telephone}`}
                    className="flex items-center gap-2.5 text-sm hover:text-medical-blue transition-colors group"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground group-hover:text-medical-blue shrink-0" />
                    {e.telephone}
                  </a>
                )}
                {e.email && (
                  <a
                    href={`mailto:${e.email}`}
                    className="flex items-center gap-2.5 text-sm hover:text-medical-blue transition-colors group"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-medical-blue shrink-0" />
                    <span className="truncate">{e.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="pt-3 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Enregistré le {new Date(e.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Etablissement Card ───────────────────────────────────────────────────────

function EtablissementCard({ e, onSelect }: { e: EtablissementRow; onSelect: () => void }) {
  const cfg = getConfig(e.type);
  const Icon = cfg.icon;

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer"
      onClick={onSelect}
    >
      {/* Colored top bar */}
      <div className={`h-1 w-full ${cfg.bg.replace("bg-", "bg-").replace("-50", "-400")}`}
        style={{ background: `var(--tw-gradient-from, currentColor)` }}
      />
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {/* Logo or icon */}
          {e.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.logo_url}
              alt={e.nom}
              className="h-11 w-11 rounded-lg object-contain border bg-white shrink-0"
            />
          ) : (
            <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}>
              <Icon className={`h-5 w-5 ${cfg.color}`} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0">{e.nom}</h3>
              {e.type && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  {cfg.label}
                </span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {[e.ville, e.region, e.pays].filter(Boolean).join(", ")}
              </span>
            </div>

            {e.adresse && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate pl-4">{e.adresse}</p>
            )}
          </div>

          {/* Arrow hint */}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
        </div>

        {/* Contact */}
        {(e.telephone || e.email) && (
          <div className="mt-4 pt-3 border-t space-y-1.5">
            {e.telephone && (
              <a
                href={`tel:${e.telephone}`}
                onClick={(ev) => ev.stopPropagation()}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 group-hover/link:text-medical-blue" />
                {e.telephone}
              </a>
            )}
            {e.email && (
              <a
                href={`mailto:${e.email}`}
                onClick={(ev) => ev.stopPropagation()}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 group-hover/link:text-medical-blue" />
                <span className="truncate">{e.email}</span>
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function EtablissementsClient({ rows }: { rows: EtablissementRow[] }) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [selected, setSelected] = useState<EtablissementRow | null>(null);

  const filtered = useMemo(() =>
    rows.filter((e) => {
      const matchType = activeType === "all" || e.type === activeType;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        e.nom.toLowerCase().includes(q) ||
        e.ville?.toLowerCase().includes(q) ||
        e.region?.toLowerCase().includes(q) ||
        e.adresse?.toLowerCase().includes(q);
      return matchType && matchSearch;
    }),
    [rows, search, activeType]
  );

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 opacity-40" />
        </div>
        <p className="font-medium">Aucun établissement enregistré</p>
        <p className="text-sm mt-1 text-muted-foreground/70">Les établissements apparaîtront ici une fois configurés.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats + type filter */}
      <StatsBar rows={rows} activeType={activeType} onType={setActiveType} />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, ville, région…"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {(search || activeType !== "all") && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {rows.length} établissement{rows.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun établissement ne correspond à votre recherche.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setActiveType("all"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <EtablissementCard key={e.id} e={e} onSelect={() => setSelected(e)} />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <EtablissementDetail
          e={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
