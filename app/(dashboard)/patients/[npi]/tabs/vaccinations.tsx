"use client";
import { useState, useEffect, useMemo, FormEvent, ChangeEvent } from "react";
import { Patient, Vaccination } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Syringe, Plus, Loader2, CheckCircle2, AlertTriangle, Clock,
  FileText, ChevronDown, ChevronUp, ChevronRight, CalendarDays, ShieldCheck,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const VACCINS_PEV = [
  "BCG (Tuberculose)",
  "DTCHepB (DTP-HepB)",
  "Polio oral (VPO)",
  "Polio injectable (VPI)",
  "Rougeole-Rubéole (MR)",
  "ROR (Rougeole-Oreillons-Rubéole)",
  "Méningite A (MenA)",
  "Pneumocoque (PCV13)",
  "Rotavirus",
  "Fièvre Jaune",
  "Hépatite B",
  "Tétanos-Diphtérie (Td)",
  "HPV (Col de l'utérus)",
  "Grippe (annuel)",
  "Typhoid Vi",
  "Rage",
  "Choléra",
];

const STATUS_CONFIG = {
  a_jour:         { label: "À jour",          variant: "success" as const, icon: CheckCircle2,  border: "border-l-green-400",  bg: "bg-green-50/30",  text: "text-green-700" },
  en_retard:      { label: "En retard",       variant: "warning" as const, icon: Clock,         border: "border-l-amber-400",  bg: "bg-amber-50/30",  text: "text-amber-700" },
  contre_indique: { label: "Contre-indiqué",  variant: "danger"  as const, icon: AlertTriangle, border: "border-l-red-400",    bg: "bg-red-50/30",    text: "text-red-700"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function RappelBadge({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)
    return <span className="text-xs font-medium text-red-600">Rappel en retard de {Math.abs(days)} j</span>;
  if (days === 0)
    return <span className="text-xs font-medium text-orange-600">Rappel aujourd&apos;hui</span>;
  if (days <= 30)
    return <span className="text-xs font-medium text-amber-600">Rappel dans {days} j ({formatDate(dateStr!)})</span>;
  return <span className="text-xs text-blue-600">Rappel : {formatDate(dateStr!)}</span>;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ vaccinations }: { vaccinations: Vaccination[] }) {
  const byVaccin = Object.values(
    vaccinations.reduce((acc, v) => { acc[v.vaccin] = v; return acc; }, {} as Record<string, Vaccination>)
  );
  const aJour    = byVaccin.filter((v) => v.statut === "a_jour").length;
  const enRetard = byVaccin.filter((v) => v.statut === "en_retard").length;
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Vaccins",      value: byVaccin.length, color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
        { label: "À jour",       value: aJour,           color: "text-green-600", bg: "bg-green-50",  border: "border-green-200" },
        { label: "En retard",    value: enRetard,        color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
        { label: "Doses totales",value: vaccinations.length, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
      ].map(({ label, value, color, bg, border }) => (
        <div key={label} className={`rounded-lg border ${border} ${bg} px-3 py-2 text-center`}>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── PEV Coverage Grid ────────────────────────────────────────────────────────

function PEVCoverageSection({ vaccinations }: { vaccinations: Vaccination[] }) {
  const [open, setOpen] = useState(false);
  const vaccinNames = new Set(vaccinations.map((v) => v.vaccin.toLowerCase()));
  const covered = VACCINS_PEV.filter((v) => vaccinNames.has(v.toLowerCase()));
  const pct = Math.round((covered.length / VACCINS_PEV.length) * 100);

  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-medical-blue" />
          Couverture vaccinale PEV
          <span className="text-xs font-normal text-muted-foreground">
            {covered.length}/{VACCINS_PEV.length} vaccins ({pct}%)
          </span>
        </span>
        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VACCINS_PEV.map((vaccin) => {
              const done = vaccinNames.has(vaccin.toLowerCase());
              return (
                <div
                  key={vaccin}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 border text-xs ${
                    done
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {done
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                  <span className="truncate">{vaccin}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Vaccine Card ─────────────────────────────────────────────────────────────

function VaccineCard({ vaccin, records }: { vaccin: string; records: Vaccination[] }) {
  const [expanded, setExpanded] = useState(false);
  const latest = records[0];
  const status = STATUS_CONFIG[latest.statut] ?? STATUS_CONFIG.a_jour;
  const StatusIcon = status.icon;

  return (
    <Card className={`overflow-hidden border-l-4 ${status.border} ${status.bg} transition-shadow hover:shadow-md`}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div className="mt-0.5 p-1.5 rounded-md bg-background border shrink-0">
          <StatusIcon className={`h-4 w-4 ${status.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{vaccin}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
            {records.length > 1 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {records.length} doses
              </span>
            )}
          </div>

          {/* Latest dose info */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(latest.date_vaccination)}
              {latest.dose && ` — ${latest.dose}`}
            </span>
            {latest.voie && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {latest.voie}
              </span>
            )}
          </div>

          {/* Next recall */}
          {latest.prochain_rappel && (
            <div className="mt-1">
              <RappelBadge dateStr={latest.prochain_rappel} />
            </div>
          )}
        </div>

        {records.length > 1 || latest.notes ? (
          <Button variant="ghost" size="icon-sm" className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {/* Expanded — dose history + notes */}
      {expanded && (records.length > 1 || latest.notes) && (
        <div className="border-t bg-background/60 p-4 space-y-3">
          {records.length > 1 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Historique des doses
              </p>
              <div className="space-y-1.5">
                {records.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground w-5 shrink-0">
                      <span className="font-bold text-foreground">{records.length - i}</span>
                    </div>
                    <span className="font-medium">{formatDate(r.date_vaccination)}</span>
                    {r.dose && <span className="text-muted-foreground">{r.dose}</span>}
                    {r.lot && <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">Lot: {r.lot}</span>}
                    {r.voie && <span className="text-muted-foreground">{r.voie}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {latest.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-muted-foreground italic">{latest.notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface VaccinationsTabProps {
  patient: Patient;
  vaccinations?: Vaccination[];
  onRefresh: () => void;
}

export function VaccinationsTab({ patient, vaccinations: initialVaccinations, onRefresh }: VaccinationsTabProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const canCreate = user?.role !== "pharmacien" && user?.role !== "laborantin";

  const [vaccinations, setVaccinations] = useState<Vaccination[]>(initialVaccinations || []);
  const [tabLoading, setTabLoading] = useState(!initialVaccinations);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [etablissements, setEtablissements] = useState<{ id: string; nom: string }[]>([]);

  const [form, setForm] = useState({
    vaccin: "", dose: "", lot: "", voie: "",
    date_vaccination: new Date().toISOString().split("T")[0],
    prochain_rappel: "", etablissement_id: "", notes: "",
  });

  useEffect(() => {
    if (initialVaccinations) return;
    supabase
      .from("vaccinations")
      .select("*")
      .eq("patient_id", patient.id)
      .order("date_vaccination", { ascending: false })
      .then(({ data }: { data: Vaccination[] | null }) => {
        setVaccinations(data || []);
        setTabLoading(false);
      });
  }, [patient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from("etablissements").select("id, nom")
      .then(({ data }: { data: { id: string; nom: string }[] | null }) => setEtablissements(data || []));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("vaccinations").insert({
        patient_id: patient.id,
        operateur_id: user.id,
        etablissement_id: form.etablissement_id || etablissements[0]?.id,
        vaccin: form.vaccin,
        dose: form.dose || null,
        lot: form.lot || null,
        voie: form.voie || null,
        date_vaccination: form.date_vaccination,
        prochain_rappel: form.prochain_rappel || null,
        statut: "a_jour",
        notes: form.notes || null,
      });
      toast({ title: "Vaccination enregistrée", description: form.vaccin });
      setOpen(false);
      setForm({ vaccin: "", dose: "", lot: "", voie: "", date_vaccination: new Date().toISOString().split("T")[0], prochain_rappel: "", etablissement_id: "", notes: "" });
      onRefresh();
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }

  // Group by vaccine name, sorted by latest dose date desc
  const rapportsByVaccin = useMemo(() => {
    const map: Record<string, Vaccination[]> = {};
    vaccinations.forEach((v: Vaccination) => { map[v.vaccin] = [...(map[v.vaccin] || []), v]; });
    return map;
  }, [vaccinations]);

  // Apply status filter (filter by latest dose status per vaccine)
  const filteredEntries = useMemo(() =>
    (Object.entries(rapportsByVaccin) as [string, Vaccination[]][]).filter(([, records]) =>
      filterStatus === "all" || records[0].statut === filterStatus
    ),
    [rapportsByVaccin, filterStatus]
  );

  // Late vaccines — prochain_rappel passed + status
  const enRetard = useMemo(() =>
    vaccinations.filter((v: Vaccination) =>
      v.statut === "en_retard" ||
      (v.prochain_rappel && daysUntil(v.prochain_rappel) !== null && daysUntil(v.prochain_rappel)! < 0)
    ),
    [vaccinations]
  );

  if (tabLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />)}
        </div>
        <div className="h-11 rounded-lg border bg-muted animate-pulse" />
        {[1,2,3].map((i) => (
          <div key={i} className="h-20 rounded-lg border bg-card animate-pulse border-l-4 border-l-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {vaccinations.length > 0 && <StatsBar vaccinations={vaccinations} />}

      {/* PEV coverage */}
      {vaccinations.length > 0 && <PEVCoverageSection vaccinations={vaccinations} />}

      {/* Late alert */}
      {enRetard.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {enRetard.length} vaccin{enRetard.length > 1 ? "s" : ""} avec rappel en retard
          </p>
          {enRetard.map((v: Vaccination) => (
            <div key={v.id} className="flex items-center gap-2 text-xs text-amber-700">
              <span className="font-medium">{v.vaccin}</span>
              {v.prochain_rappel && <RappelBadge dateStr={v.prochain_rappel} />}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Statut…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground flex-1">
          {filteredEntries.length !== Object.keys(rapportsByVaccin).length
            ? `${filteredEntries.length} / ${Object.keys(rapportsByVaccin).length} vaccins`
            : `${Object.keys(rapportsByVaccin).length} vaccin${Object.keys(rapportsByVaccin).length > 1 ? "s" : ""} — ${vaccinations.length} dose${vaccinations.length > 1 ? "s" : ""}`}
        </span>
        {vaccinations.length > 0 && (
          <Button
            variant="outline" size="sm"
            onClick={async () => {
              const res = await fetch("/api/certificat-vaccinal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patient, vaccinations, etablissement: etablissements[0]?.nom || "MediLink" }),
              });
              const html = await res.text();
              const win = window.open("", "_blank");
              if (win) { win.document.write(html); win.document.close(); }
            }}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Certificat
          </Button>
        )}
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Enregistrer vaccination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle vaccination — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* Vaccin */}
                <div className="space-y-1.5">
                  <Label>Vaccin *</Label>
                  <Input
                    value={form.vaccin}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, vaccin: e.target.value })}
                    placeholder="Ex: BCG, Fièvre Jaune…"
                    list="vaccins-list" required className="h-9"
                  />
                  <datalist id="vaccins-list">
                    {VACCINS_PEV.map((v) => <option key={v} value={v} />)}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Dose</Label>
                    <Input
                      value={form.dose}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, dose: e.target.value })}
                      placeholder="1ère, Rappel…" className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Numéro de lot</Label>
                    <Input
                      value={form.lot}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, lot: e.target.value })}
                      placeholder="LOT-2024-001" className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Voie d&apos;administration</Label>
                    <Select onValueChange={(v: string) => setForm({ ...form, voie: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Voie…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Intramusculaire (IM)</SelectItem>
                        <SelectItem value="SC">Sous-cutanée (SC)</SelectItem>
                        <SelectItem value="ID">Intradermique (ID)</SelectItem>
                        <SelectItem value="PO">Orale (PO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date vaccination *</Label>
                    <Input
                      type="date" value={form.date_vaccination}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, date_vaccination: e.target.value })}
                      required className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Prochain rappel</Label>
                    <Input
                      type="date" value={form.prochain_rappel}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, prochain_rappel: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Établissement</Label>
                    <Select onValueChange={(v: string) => setForm({ ...form, etablissement_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {etablissements.map((e: { id: string; nom: string }) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Réactions, observations…"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty state */}
      {vaccinations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Syringe className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucune vaccination enregistrée</p>
          <p className="text-sm mt-1">Enregistrez le carnet vaccinal de ce patient.</p>
          {canCreate && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Enregistrer vaccination
            </Button>
          )}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">Aucun vaccin avec ce statut.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilterStatus("all")}>
            Voir tous les vaccins
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(([vaccin, records]: [string, Vaccination[]]) => (
            <VaccineCard key={vaccin} vaccin={vaccin} records={records} />
          ))}
        </div>
      )}
    </div>
  );
}
