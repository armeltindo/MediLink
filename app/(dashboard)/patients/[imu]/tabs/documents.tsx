"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Patient, Document } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Upload, Loader2, Download, Eye,
  Image as ImageIcon, Scan, FilePen, ShieldCheck,
  File, Search, X, CloudUpload,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: any; color: string; bg: string; border: string }> = {
  imagerie:     { label: "Imagerie",      variant: "info",      icon: Scan,       color: "text-blue-600",   bg: "bg-blue-50",   border: "border-l-blue-400"   },
  compte_rendu: { label: "Compte-rendu",  variant: "secondary", icon: FilePen,    color: "text-slate-600",  bg: "bg-slate-50",  border: "border-l-slate-400"  },
  ordonnance:   { label: "Ordonnance",    variant: "warning",   icon: FileText,   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-l-amber-400"  },
  certificat:   { label: "Certificat",    variant: "medical",   icon: ShieldCheck,color: "text-green-600",  bg: "bg-green-50",  border: "border-l-green-400"  },
  autre:        { label: "Autre",         variant: "secondary", icon: File,       color: "text-gray-500",   bg: "bg-gray-50",   border: "border-l-gray-300"   },
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileExtension(name: string): string {
  return name.split(".").pop()?.toUpperCase() ?? "DOC";
}

function isImage(url: string, name: string): boolean {
  const lower = (url + name).toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp)/.test(lower);
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ documents }: { documents: Document[] }) {
  const total = documents.length;
  const typeCounts = documents.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const totalSize = documents.reduce((acc, d) => acc + (d.taille || 0), 0);

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-muted/30">
      <span className="text-xs font-semibold text-muted-foreground mr-1">
        {total} document{total > 1 ? "s" : ""}
      </span>
      {Object.entries(typeCounts).map(([type, count]) => {
        const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre;
        const Icon = cfg.icon;
        return (
          <span key={type} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label} <span className="font-bold">{count}</span>
          </span>
        );
      })}
      {totalSize > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">{formatFileSize(totalSize)} total</span>
      )}
    </div>
  );
}

// ─── Upload Drop Zone ─────────────────────────────────────────────────────────

function DropZone({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  }

  function validateAndSet(f: File) {
    if (f.size > MAX_FILE_SIZE) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Maximum 20 Mo" });
      return;
    }
    onFile(f);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors p-6 text-center ${
        dragging ? "border-medical-blue bg-blue-50" : "border-border hover:border-medical-blue hover:bg-muted/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.dcm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f); }}
      />
      {file ? (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-5 w-5 text-medical-blue" />
            <span className="truncate max-w-48">{file.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
          <Button
            type="button" variant="ghost" size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <CloudUpload className={`h-8 w-8 ${dragging ? "text-medical-blue" : "text-muted-foreground/50"}`} />
          <div>
            <p className="text-sm font-medium">Glissez un fichier ici</p>
            <p className="text-xs text-muted-foreground mt-0.5">ou cliquez pour choisir — PDF, JPG, PNG (max 20 Mo)</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc }: { doc: Document }) {
  const config = TYPE_CONFIG[doc.type] ?? TYPE_CONFIG.autre;
  const Icon = config.icon;
  const ext = fileExtension(doc.nom || doc.url);
  const canPreview = isImage(doc.url, doc.nom) || doc.nom?.toLowerCase().endsWith(".pdf") || doc.url?.toLowerCase().endsWith(".pdf");

  return (
    <Card className={`overflow-hidden border-l-4 ${config.border} hover:shadow-md transition-shadow`}>
      <CardContent className="p-0">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => window.open(doc.url, "_blank")}
        >
          {/* Type icon */}
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} border`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{doc.nom}</span>
              <Badge variant={config.variant} className="text-xs shrink-0">{config.label}</Badge>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{ext}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{formatDate(doc.uploaded_at)}</span>
              {doc.taille ? <span>{formatFileSize(doc.taille)}</span> : null}
              {doc.description && <span className="truncate italic">{doc.description}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {canPreview && (
              <Button variant="ghost" size="icon-sm" asChild title="Aperçu">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                </a>
              </Button>
            )}
            {isImage(doc.url, doc.nom) && (
              <Button variant="ghost" size="icon-sm" asChild title="Voir image">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" asChild title="Télécharger">
              <a href={doc.url} download={doc.nom}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  patient: Patient;
}

export function DocumentsTab({ patient }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useUser();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [form, setForm] = useState({ nom: "", type: "autre", description: "" });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { loadDocuments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setUploading(true);
    try {
      const fileName = `${patient.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(fileName);

      const { error } = await supabase.from("documents").insert({
        patient_id: patient.id,
        nom: form.nom || file.name,
        url: publicUrl,
        type: form.type as Document["type"],
        taille: file.size,
        uploaded_by: user.id,
        description: form.description || null,
      });
      if (error) throw error;

      toast({ title: "Document uploadé avec succès", description: form.nom || file.name });
      setOpen(false);
      setFile(null);
      setForm({ nom: "", type: "autre", description: "" });
      loadDocuments();
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setUploading(false);
    }
  }

  // Filter + search
  const filtered = useMemo(() =>
    documents.filter((d: Document) => {
      const matchType = filterType === "all" || d.type === filterType;
      const matchSearch = !search || d.nom.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    }),
    [documents, filterType, search]
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      {documents.length > 0 && !loading && <StatsBar documents={documents} />}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-8 h-8 text-xs"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Counter */}
        <span className="text-xs text-muted-foreground shrink-0">
          {filtered.length !== documents.length
            ? `${filtered.length} / ${documents.length}`
            : `${documents.length} doc${documents.length > 1 ? "s" : ""}`}
        </span>

        {/* Upload */}
        {user && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setForm({ nom: "", type: "autre", description: "" }); } }}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Upload className="h-4 w-4 mr-1.5" />Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un document — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* Drop zone */}
                <div className="space-y-1.5">
                  <Label>Fichier *</Label>
                  <DropZone file={file} onFile={setFile} />
                </div>

                <div className="space-y-1.5">
                  <Label>Nom du document</Label>
                  <Input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder={file?.name || "Ex: Radio thorax — Mars 2026"}
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imagerie">Imagerie</SelectItem>
                        <SelectItem value="compte_rendu">Compte-rendu</SelectItem>
                        <SelectItem value="ordonnance">Ordonnance</SelectItem>
                        <SelectItem value="certificat">Certificat</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brève description…"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={uploading || !file}>
                    {uploading
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Upload className="h-4 w-4 mr-2" />}
                    Uploader
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg border border-l-4 border-l-muted" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Aucun document</p>
          <p className="text-sm mt-1">Ajoutez des ordonnances, résultats, imagerie…</p>
          {user && (
            <Button variant="medical" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />Ajouter un document
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">Aucun document ne correspond à votre recherche.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setFilterType("all"); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: Document) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
