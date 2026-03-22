"use client";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search, X, Plus, Pencil, Trash2, AlertTriangle, AlertOctagon,
  Package, Archive, ChevronRight, CheckCircle2, CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  pharmacie_id: string;
  medicament_dci: string;
  medicament_commercial: string | null;
  forme: string | null;
  unite: string;
  quantite_stock: number;
  seuil_alerte: number;
  lot: string | null;
  date_peremption: string | null;
  updated_at: string;
}

interface Props {
  initialItems: StockItem[];
  pharmacieId: string | null;
  pharmacieNom: string | null;
  userRole: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilPeremption(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function getStockLevel(item: StockItem): "ok" | "low" | "empty" {
  if (item.quantite_stock === 0) return "empty";
  if (item.quantite_stock <= item.seuil_alerte) return "low";
  return "ok";
}

function StockBadge({ item }: { item: StockItem }) {
  const level = getStockLevel(item);
  if (level === "empty")
    return <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertOctagon className="h-3 w-3" />Rupture</span>;
  if (level === "low")
    return <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Faible</span>;
  return <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />OK</span>;
}

function PeremptionBadge({ date }: { date: string | null }) {
  const days = daysUntilPeremption(date);
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (days < 0)   return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Périmé</span>;
  if (days <= 30) return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Dans {days}j</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(date!))}
    </span>
  );
}

// ─── Form dialog ──────────────────────────────────────────────────────────────

interface FormState {
  medicament_dci: string;
  medicament_commercial: string;
  forme: string;
  unite: string;
  quantite_stock: string;
  seuil_alerte: string;
  lot: string;
  date_peremption: string;
}

const EMPTY_FORM: FormState = {
  medicament_dci: "", medicament_commercial: "", forme: "",
  unite: "comprimé", quantite_stock: "0", seuil_alerte: "10",
  lot: "", date_peremption: "",
};

function StockFormDialog({
  pharmacieId,
  initial,
  onSave,
  onClose,
}: {
  pharmacieId: string;
  initial: StockItem | null;
  onSave: (item: StockItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          medicament_dci: initial.medicament_dci,
          medicament_commercial: initial.medicament_commercial ?? "",
          forme: initial.forme ?? "",
          unite: initial.unite,
          quantite_stock: String(initial.quantite_stock),
          seuil_alerte: String(initial.seuil_alerte),
          lot: initial.lot ?? "",
          date_peremption: initial.date_peremption?.split("T")[0] ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.medicament_dci.trim()) { setErr("Le DCI est requis"); return; }
    const qty = parseInt(form.quantite_stock, 10);
    const seuil = parseInt(form.seuil_alerte, 10);
    if (isNaN(qty) || qty < 0) { setErr("Quantité invalide"); return; }
    if (isNaN(seuil) || seuil < 0) { setErr("Seuil invalide"); return; }

    setSaving(true);
    try {
      const payload = {
        ...(initial ? { id: initial.id } : { pharmacie_id: pharmacieId }),
        medicament_dci: form.medicament_dci.trim(),
        medicament_commercial: form.medicament_commercial.trim() || null,
        forme: form.forme.trim() || null,
        unite: form.unite || "comprimé",
        quantite_stock: qty,
        seuil_alerte: seuil,
        lot: form.lot.trim() || null,
        date_peremption: form.date_peremption || null,
      };

      const res = await fetch("/api/pharmacie/stock", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Erreur"); return; }
      const saved = await res.json();
      onSave(saved);
    } catch { setErr("Erreur réseau"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            {initial ? "Modifier le stock" : "Ajouter un médicament"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>DCI (dénomination commune) *</Label>
              <Input value={form.medicament_dci} onChange={set("medicament_dci")} placeholder="Ex: Amoxicilline" autoFocus />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Nom commercial</Label>
              <Input value={form.medicament_commercial} onChange={set("medicament_commercial")} placeholder="Ex: Augmentin" />
            </div>
            <div className="space-y-1">
              <Label>Forme</Label>
              <Input value={form.forme} onChange={set("forme")} placeholder="comprimé, sirop…" />
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Input value={form.unite} onChange={set("unite")} placeholder="comprimé" />
            </div>
            <div className="space-y-1">
              <Label>Quantité en stock *</Label>
              <Input type="number" min={0} value={form.quantite_stock} onChange={set("quantite_stock")} />
            </div>
            <div className="space-y-1">
              <Label>Seuil d&apos;alerte</Label>
              <Input type="number" min={0} value={form.seuil_alerte} onChange={set("seuil_alerte")} />
            </div>
            <div className="space-y-1">
              <Label>N° de lot</Label>
              <Input value={form.lot} onChange={set("lot")} placeholder="LOT-XXXX" />
            </div>
            <div className="space-y-1">
              <Label>Date de péremption</Label>
              <Input type="date" value={form.date_peremption} onChange={set("date_peremption")} />
            </div>
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={saving}>
              {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InventaireClient({ initialItems, pharmacieId, pharmacieNom, userRole }: Props) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "peremption">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canEdit = userRole === "pharmacien" || userRole === "super_admin";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      if (q) {
        const name = `${it.medicament_dci} ${it.medicament_commercial ?? ""}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (filter === "low")
        return getStockLevel(it) === "low" || getStockLevel(it) === "empty";
      if (filter === "peremption") {
        const days = daysUntilPeremption(it.date_peremption);
        return days !== null && days <= 30;
      }
      return true;
    });
  }, [items, search, filter]);

  const counts = useMemo(() => ({
    total: items.length,
    low: items.filter(it => getStockLevel(it) !== "ok").length,
    peremption: items.filter(it => { const d = daysUntilPeremption(it.date_peremption); return d !== null && d <= 30; }).length,
  }), [items]);

  const handleSave = useCallback((saved: StockItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setFormOpen(false);
    setEditing(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch("/api/pharmacie/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    } finally { setDeleting(null); }
  }, []);

  return (
    <div className="space-y-4">
      {/* Bandeau pharmacie */}
      {pharmacieId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
          <Archive className="h-4 w-4 shrink-0" />
          <span>Inventaire — <span className="font-semibold">{pharmacieNom ?? "Pharmacie active"}</span></span>
          {canEdit && (
            <Button
              size="sm"
              className="ml-auto h-7 bg-purple-600 hover:bg-purple-700 text-white text-xs"
              onClick={() => { setEditing(null); setFormOpen(true); }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      )}

      {/* Filtres rapides */}
      <div className="flex gap-1 border-b">
        {([
          { key: "all",        label: "Tous",           count: counts.total },
          { key: "low",        label: "Stock faible",   count: counts.low },
          { key: "peremption", label: "Péremption <30j", count: counts.peremption },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              filter === tab.key
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab.key === "all" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par DCI ou nom commercial…"
          className="pl-9 pr-9 h-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length !== items.length
          ? `${filtered.length} / ${items.length} médicament${items.length > 1 ? "s" : ""}`
          : `${items.length} médicament${items.length > 1 ? "s" : ""}`}
      </p>

      {/* Liste */}
      {!pharmacieId ? (
        <div className="text-center py-20 text-muted-foreground">
          <Archive className="mx-auto h-14 w-14 opacity-20 mb-4" />
          <p className="font-medium text-sm">Aucune pharmacie sélectionnée</p>
          <p className="text-xs mt-1.5">Sélectionnez votre pharmacie active pour gérer l&apos;inventaire.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="mx-auto h-10 w-10 opacity-15 mb-3" />
          <p className="text-sm">{items.length === 0 ? "Inventaire vide" : "Aucun résultat"}</p>
          {canEdit && items.length === 0 && (
            <Button size="sm" className="mt-3 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter le premier médicament
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const level = getStockLevel(item);
            const borderClass =
              level === "empty" ? "border-l-red-400"   :
              level === "low"   ? "border-l-amber-400"  :
              "border-l-emerald-400";

            return (
              <Card key={item.id} className={`border-l-4 ${borderClass} shadow-sm hover:shadow-md transition-all`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background border shrink-0">
                    <Package className={`h-4 w-4 ${
                      level === "empty" ? "text-red-500" :
                      level === "low"   ? "text-amber-500" :
                      "text-emerald-500"
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{item.medicament_dci}</span>
                      {item.medicament_commercial && (
                        <span className="text-xs text-muted-foreground">({item.medicament_commercial})</span>
                      )}
                      <StockBadge item={item} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {item.forme && <span className="text-xs text-muted-foreground">{item.forme}</span>}
                      <span className="text-xs font-medium">
                        {item.quantite_stock} {item.unite}
                        <span className="text-muted-foreground font-normal"> (seuil: {item.seuil_alerte})</span>
                      </span>
                      {item.lot && <span className="text-xs text-muted-foreground">Lot: {item.lot}</span>}
                      {item.date_peremption && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <PeremptionBadge date={item.date_peremption} />
                        </span>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                        onClick={() => { setEditing(item); setFormOpen(true); }}
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Badges résumé */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap pt-1">
          <Badge variant="secondary" className="text-xs gap-1">
            <Package className="h-3 w-3" />{counts.total} références
          </Badge>
          {counts.low > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
              <AlertTriangle className="h-3 w-3" />{counts.low} stock faible
            </Badge>
          )}
          {counts.peremption > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100 gap-1">
              <CalendarDays className="h-3 w-3" />{counts.peremption} péremption proche
            </Badge>
          )}
        </div>
      )}

      {formOpen && pharmacieId && (
        <StockFormDialog
          pharmacieId={pharmacieId}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
