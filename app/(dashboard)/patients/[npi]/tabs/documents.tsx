"use client";
import { useState, useEffect } from "react";
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
import { FileText, Upload, Loader2, Download, Eye, Image as ImageIcon } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typeConfig: Record<string, { label: string; variant: BadgeVariant; icon: any }> = {
  imagerie: { label: "Imagerie", variant: "info", icon: ImageIcon },
  compte_rendu: { label: "Compte-rendu", variant: "secondary", icon: FileText },
  ordonnance: { label: "Ordonnance", variant: "warning", icon: FileText },
  certificat: { label: "Certificat", variant: "medical", icon: FileText },
  autre: { label: "Autre", variant: "secondary", icon: FileText },
};

interface DocumentsTabProps {
  patient: Patient;
}

export function DocumentsTab({ patient }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useUser();

  const [form, setForm] = useState({
    nom: "", type: "autre", description: "",
    etablissement_id: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

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
      // Upload to Supabase Storage
      const fileName = `${patient.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(fileName);

      const { error } = await supabase.from("documents").insert({
        patient_id: patient.id,
        nom: form.nom || file.name,
        url: publicUrl,
        type: form.type,
        taille: file.size,
        uploaded_by: user.id,
        description: form.description || null,
      });

      if (error) throw error;
      toast({ title: "Document uploadé avec succès" });
      setOpen(false);
      loadDocuments();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setUploading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Documents ({documents.length})</h3>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="medical" size="sm">
                <Upload className="h-4 w-4 mr-1.5" />
                Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload document — {patient.prenom} {patient.nom}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label>Fichier *</Label>
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.dcm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG acceptés (max 20 Mo)</p>
                </div>
                <div className="space-y-2">
                  <Label>Nom du document</Label>
                  <Input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Ex: Radio thorax du 15/03/2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imagerie">Imagerie (Radio, Écho, Scanner...)</SelectItem>
                      <SelectItem value="compte_rendu">Compte-rendu médical</SelectItem>
                      <SelectItem value="ordonnance">Ordonnance</SelectItem>
                      <SelectItem value="certificat">Certificat médical</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brève description..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" variant="medical" disabled={uploading}>
                    {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun document</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {documents.map((doc) => {
            const config = typeConfig[doc.type] || typeConfig.autre;
            const Icon = config.icon;

            return (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{doc.nom}</span>
                      <Badge variant={config.variant} className="text-xs shrink-0">{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{formatDate(doc.uploaded_at)}</span>
                      {doc.taille && <span>{formatFileSize(doc.taille)}</span>}
                      {doc.description && <span className="truncate">{doc.description}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" asChild title="Voir">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild title="Télécharger">
                      <a href={doc.url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
