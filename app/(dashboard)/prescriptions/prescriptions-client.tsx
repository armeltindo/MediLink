"use client";
import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import {
  Pill, Search, X, ChevronRight, User, CalendarDays,
  Clock, CheckCircle2, Ban, Stethoscope, ClipboardList,
  CalendarCheck, Repeat2, FlaskConical, Package, Store,
  ArrowLeftRight,
} from "lucide-react";

export interface PrescriptionRow {
  id: string;
  medicament_dci: string;
  medicament_commercial: string | null;
  dosage: string;
  forme: string | null;
  posologie: string;
  duree: string;
  instructions: string | null;
  statut: string;
  date_prescription: string;
  date_expiration: string | null;
  date_dispensation: string | null;
  substitution_generique: string | null;
  pharmacie_id: string | null;
  patients: { imu: string; nom: string; prenom: string } | null;
  pharmacie: { nom: string } | null;
}

interface Props {
  rows: PrescriptionRow[];
  userRole: string | null;
  pharmacieId: string | null;
  pharmacieNom: string | null;
}

type TabKey = "actif" | "termine" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "actif",   label: "Actives" },
  { key: "termine", label: "Terminées" },
  { key: "all",     label: "Toutes" },
];

const STATUT_STYLE: Record<string, {
  label: string; bg: string; text: string;
  border: string; icon: typeof Pill; iconClass: string;
}> = {
  prescrit: { label: "Prescrit",  bg: "bg-blue-100",   text: "text-blue-800",   border: "border-l-blue-400",   icon: Pill,         iconClass: "text-blue-500" },
  en_cours: { label: "En cours",  bg: "bg-green-100",  text: "text-green-800",  border: "border-l-green-400",  icon: CheckCircle2, iconClass: "text-green-500" },
  dispense: { label: "Dispensé",  bg: "bg-purple-100", text: "text-purple-800", border: "border-l-purple-400", icon: Package,      iconClass: "text-purple-500" },
  termine:  { label: "Terminé",   bg: "bg-gray-100",   text: "text-gray-600",   border: "border-l-gray-300",   icon: CheckCircle2, iconClass: "text-gray-400" },
  annule:   { label: "Annulé",    bg: "bg-red-100",    text: "text-red-800",    border: "border-l-red-400",    icon: Ban,          iconClass: "text-red-500" },
};

function getStyle(statut: string) {
  return STATUT_STYLE[statut] ?? STATUT_STYLE.prescrit;
}

function daysUntilExpiry(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function ExpiryChip({ date }: { date: string | null }) {
  const days = daysUntilExpiry(date);
  if (days === null) return null;
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <Clock className="h-3 w-3" />
        Expirée
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
        <Clock className="h-3 w-3" />
        Expire aujourd&apos;hui
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <Clock className="h-3 w-3" />
        Expire dans {days} j
      </span>
    );
  return null;
}

/* ── Dialog de dispensation ─────────────────────────────────────────── */
function DispensationDialog({
  p,
  pharmacieId,
  pharmacieNom,
  onClose,
  onSuccess,
}: {
  p: PrescriptionRow;
  pharmacieId: string;
  pharmacieNom: string;
  onClose: () => void;
  onSuccess: (updated: Partial<PrescriptionRow>) => void;
}) {
  const [produitServi, setProduitServi] = useState(p.medicament_dci);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSimilaire =
    produitServi.trim().toLowerCase() !== p.medicament_dci.trim().toLowerCase();

  async function handleDispenser() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/${p.id}/dispenser`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacie_id: pharmacieId,
          produit_servi: produitServi.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur inconnue");
        return;
      }
      onSuccess({
        statut: "dispense",
        date_dispensation: json.date_dispensation,
        pharmacie_id: pharmacieId,
        pharmacie: { nom: pharmacieNom },
        substitution_generique: json.substitution_generique,
      });
      onClose();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-purple-500" />
            Dispenser ce produit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Récapitulatif */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Produit prescrit</p>
            <p className="text-sm font-bold text-blue-900">{p.medicament_dci}</p>
            {p.medicament_commercial && (
              <p className="text-xs text-blue-700">({p.medicament_commercial})</p>
            )}
            <p className="text-xs text-blue-600">{p.dosage}{p.forme ? ` · ${p.forme}` : ""} · {p.posologie} · {p.duree}</p>
          </div>

          {/* Pharmacie */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border text-sm">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{pharmacieNom}</span>
          </div>

          {/* Produit réellement servi */}
          <div className="space-y-1.5">
            <Label htmlFor="produit-servi" className="flex items-center gap-1.5 text-sm">
              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
              Produit remis au patient
            </Label>
            <Input
              id="produit-servi"
              value={produitServi}
              onChange={(e) => setProduitServi(e.target.value)}
              placeholder={p.medicament_dci}
              className="h-9"
            />
            {isSimilaire && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                Substitution notée — similaire ou générique
              </p>
            )}
            {!isSimilaire && (
              <p className="text-xs text-muted-foreground">
                Modifiez si vous remettez un générique ou un similaire.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="medical"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleDispenser}
              disabled={loading || !produitServi.trim()}
            >
              <Package className="h-4 w-4" />
              {loading ? "Enregistrement…" : "Confirmer la dispensation"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Detail dialog ──────────────────────────────────────────────────── */
function DetailDialog({
  p,
  userRole,
  pharmacieId,
  pharmacieNom,
  onClose,
  onDispensed,
}: {
  p: PrescriptionRow;
  userRole: string | null;
  pharmacieId: string | null;
  pharmacieNom: string | null;
  onClose: () => void;
  onDispensed: (updated: Partial<PrescriptionRow>) => void;
}) {
  const s = getStyle(p.statut);
  const StatusIcon = s.icon;
  const expiryDays = daysUntilExpiry(p.date_expiration);
  const [showDispensation, setShowDispensation] = useState(false);

  const canDispense =
    userRole === "pharmacien" &&
    pharmacieId !== null &&
    p.statut === "prescrit" &&
    (p.date_expiration === null || daysUntilExpiry(p.date_expiration)! >= 0);

  const fields: { icon: typeof User; label: string; value: ReactNode }[] = [
    {
      icon: User,
      label: "Patient",
      value: p.patients ? (
        <Link
          href={`/patients/${p.patients.imu}`}
          className="text-sm font-medium text-medical-green hover:underline underline-offset-2"
          onClick={onClose}
        >
          {p.patients.prenom} {p.patients.nom}
        </Link>
      ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      icon: FlaskConical,
      label: "Dosage / Forme",
      value: (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{p.dosage}</span>
          {p.forme && <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{p.forme}</span>}
        </div>
      ),
    },
    {
      icon: Repeat2,
      label: "Posologie",
      value: <span className="text-sm font-medium">{p.posologie}</span>,
    },
    {
      icon: CalendarDays,
      label: "Durée",
      value: <span className="text-sm font-medium">{p.duree}</span>,
    },
    {
      icon: CalendarDays,
      label: "Date de prescription",
      value: <span className="text-sm font-medium">{formatDate(p.date_prescription)}</span>,
    },
    ...(p.date_expiration ? [{
      icon: CalendarCheck,
      label: "Date d'expiration",
      value: (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{formatDate(p.date_expiration)}</span>
          {expiryDays !== null && expiryDays <= 7 && (
            expiryDays < 0
              ? <span className="text-xs font-medium text-red-600">Expirée</span>
              : expiryDays === 0
              ? <span className="text-xs font-medium text-orange-600">Aujourd&apos;hui</span>
              : <span className="text-xs font-medium text-amber-600">Dans {expiryDays} j</span>
          )}
        </div>
      ),
    }] : []),
    ...(p.date_dispensation ? [{
      icon: Package,
      label: "Date de dispensation",
      value: <span className="text-sm font-medium">{formatDate(p.date_dispensation)}</span>,
    }] : []),
    ...(p.pharmacie ? [{
      icon: Store,
      label: "Pharmacie",
      value: <span className="text-sm font-medium">{p.pharmacie.nom}</span>,
    }] : []),
    ...(p.medicament_commercial ? [{
      icon: Pill,
      label: "Nom commercial",
      value: <span className="text-sm font-medium">{p.medicament_commercial}</span>,
    }] : []),
    ...(p.substitution_generique ? [{
      icon: ArrowLeftRight,
      label: "Produit remis (substitution)",
      value: <span className="text-sm font-medium text-amber-700">{p.substitution_generique}</span>,
    }] : []),
    ...(p.instructions ? [{
      icon: ClipboardList,
      label: "Instructions",
      value: <p className="text-sm text-foreground whitespace-pre-wrap">{p.instructions}</p>,
    }] : []),
  ];

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg border shrink-0 bg-background border-l-4 ${s.border}`}>
                <StatusIcon className={`h-5 w-5 ${s.iconClass}`} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base leading-snug">{p.medicament_dci}</DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                  <ExpiryChip date={p.date_expiration} />
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

            {p.statut === "annule" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="p-1.5 rounded-md bg-white border border-red-200 shrink-0">
                  <Ban className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Prescription annulée</p>
                  <p className="text-xs text-red-600 mt-0.5">Cette prescription a été annulée.</p>
                </div>
              </div>
            )}

            {/* Avertissement pharmacien sans pharmacie rattachée */}
            {userRole === "pharmacien" && !pharmacieId && p.statut === "prescrit" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Store className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Vous n&apos;êtes rattaché à aucune pharmacie. Contactez un administrateur.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {canDispense && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setShowDispensation(true)}
              >
                <Package className="h-4 w-4" />
                Dispenser
              </Button>
            )}
            {p.patients && !canDispense && (
              <Button variant="medical" size="sm" className="flex-1 gap-2" asChild>
                <Link href={`/patients/${p.patients.imu}`} onClick={onClose}>
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

      {showDispensation && pharmacieId && pharmacieNom && (
        <DispensationDialog
          p={p}
          pharmacieId={pharmacieId}
          pharmacieNom={pharmacieNom}
          onClose={() => setShowDispensation(false)}
          onSuccess={(updated) => {
            onDispensed(updated);
            setShowDispensation(false);
          }}
        />
      )}
    </>
  );
}

/* ── Main list ──────────────────────────────────────────────────────── */
export function PrescriptionsList({ rows, userRole, pharmacieId, pharmacieNom }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("actif");
  const [selected, setSelected] = useState<PrescriptionRow | null>(null);
  const [localRows, setLocalRows] = useState<PrescriptionRow[]>(rows);

  function handleDispensed(id: string, updated: Partial<PrescriptionRow>) {
    setLocalRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
    setSelected((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
  }

  const tabCounts = useMemo(() => ({
    actif:   localRows.filter((p) => ["prescrit", "en_cours", "dispense"].includes(p.statut)).length,
    termine: localRows.filter((p) => ["termine", "annule"].includes(p.statut)).length,
    all:     localRows.length,
  }), [localRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localRows.filter((p) => {
      if (q) {
        const patient = p.patients ? `${p.patients.prenom} ${p.patients.nom}`.toLowerCase() : "";
        const med = `${p.medicament_dci} ${p.medicament_commercial ?? ""}`.toLowerCase();
        if (!med.includes(q) && !patient.includes(q)) return false;
      }
      if (tab === "actif")   return ["prescrit", "en_cours", "dispense"].includes(p.statut);
      if (tab === "termine") return ["termine", "annule"].includes(p.statut);
      return true;
    });
  }, [localRows, search, tab]);

  if (localRows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Pill className="h-7 w-7 opacity-30" />
        </div>
        <p className="font-medium text-sm">Aucune prescription enregistrée</p>
        <p className="text-xs mt-1.5 max-w-xs mx-auto">
          Les prescriptions sont saisies depuis le{" "}
          <Link href="/patients" className="text-medical-green underline underline-offset-2">
            dossier patient
          </Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau pharmacien */}
      {userRole === "pharmacien" && pharmacieId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
          <Store className="h-4 w-4 shrink-0" />
          <span>
            Dispensation active — <span className="font-semibold">{pharmacieNom}</span>
          </span>
        </div>
      )}

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
                  key === "actif"
                    ? "bg-green-100 text-green-700"
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
          placeholder="Rechercher par médicament ou patient…"
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
        {filtered.length !== localRows.length
          ? `${filtered.length} / ${localRows.length} prescription${localRows.length > 1 ? "s" : ""}`
          : `${localRows.length} prescription${localRows.length > 1 ? "s" : ""}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Aucun résultat{search ? ` pour "${search}"` : ""}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setTab("actif"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const s = getStyle(p.statut);
            const StatusIcon = s.icon;
            const expiring = daysUntilExpiry(p.date_expiration);
            const isExpiringSoon = expiring !== null && expiring >= 0 && expiring <= 7;
            const dispensable =
              userRole === "pharmacien" && pharmacieId && p.statut === "prescrit" &&
              (p.date_expiration === null || daysUntilExpiry(p.date_expiration)! >= 0);

            return (
              <button
                key={p.id}
                type="button"
                className="w-full text-left group"
                onClick={() => setSelected(p)}
              >
                <Card className={`border-l-4 ${s.border} shadow-sm hover:shadow-md transition-all group-hover:translate-x-0.5 ${isExpiringSoon ? "ring-1 ring-amber-200" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5 p-1.5 rounded-md bg-background border shrink-0">
                      <StatusIcon className={`h-4 w-4 ${s.iconClass}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm group-hover:text-medical-green transition-colors">
                          {p.medicament_dci}
                        </span>
                        {p.medicament_commercial && (
                          <span className="text-xs text-muted-foreground">({p.medicament_commercial})</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                        <ExpiryChip date={p.date_expiration} />
                        {dispensable && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                            <Package className="h-2.5 w-2.5" />
                            À dispenser
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {p.patients && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {p.patients.prenom} {p.patients.nom}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {p.dosage}{p.forme ? ` · ${p.forme}` : ""} · {p.posologie}
                        </span>
                        {p.pharmacie && (
                          <span className="text-xs text-purple-600 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {p.pharmacie.nom}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date + arrow */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(p.date_prescription)}
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

      {selected && (
        <DetailDialog
          p={selected}
          userRole={userRole}
          pharmacieId={pharmacieId}
          pharmacieNom={pharmacieNom}
          onClose={() => setSelected(null)}
          onDispensed={(updated) => handleDispensed(selected.id, updated)}
        />
      )}
    </div>
  );
}
