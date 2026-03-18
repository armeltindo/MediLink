"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Image, FilePlus, Download, Search,
  FileCheck, File, FolderOpen, ExternalLink,
} from "lucide-react";

interface DocumentRow {
  id: string;
  patient_id: string;
  nom: string;
  url: string;
  type: string;
  taille?: number;
  description?: string;
  uploaded_at: string;
  patients: { npi: string; nom: string; prenom: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  imagerie:      { label: "Imagerie", color: "bg-blue-100 text-blue-700", icon: Image },
  compte_rendu:  { label: "Compte rendu", color: "bg-green-100 text-green-700", icon: FileCheck },
  ordonnance:    { label: "Ordonnance", color: "bg-orange-100 text-orange-700", icon: FileText },
  certificat:    { label: "Certificat", color: "bg-purple-100 text-purple-700", icon: FilePlus },
  autre:         { label: "Autre", color: "bg-gray-100 text-gray-700", icon: File },
};

export default function DocumentsPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (user) loadDocuments();
  }, [user]);

  async function loadDocuments() {
    setLoading(true);
    const query = supabase
      .from("documents")
      .select("*, patients!inner(npi, nom, prenom)")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(200);

    const { data } = await query;
    setDocuments((data as DocumentRow[]) || []);
    setLoading(false);
  }

  const filtered = documents.filter((d) => {
    const matchSearch =
      !search ||
      d.nom.toLowerCase().includes(search.toLowerCase()) ||
      d.patients?.nom.toLowerCase().includes(search.toLowerCase()) ||
      d.patients?.prenom.toLowerCase().includes(search.toLowerCase()) ||
      d.patients?.npi.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || d.type === filterType;
    return matchSearch && matchType;
  });

  function formatSize(bytes?: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Documents médicaux" />
      <div className="p-6 space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold">Documents médicaux</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Imagerie, comptes rendus, ordonnances et certificats
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const count = documents.filter((d) => d.type === type).length;
            const Icon = cfg.icon;
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all ${filterType === type ? "ring-2 ring-medical-green" : ""}`}
                onClick={() => setFilterType(filterType === type ? "all" : type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and filter */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par patient, NPI ou nom de fichier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filterType !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setFilterType("all")}>
              Réinitialiser filtre
            </Button>
          )}
          <Badge variant="secondary">{filtered.length} document(s)</Badge>
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium text-muted-foreground">Aucun document trouvé</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les documents sont téléversés depuis les fiches patients.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const cfg = TYPE_CONFIG[doc.type] || TYPE_CONFIG.autre;
              const Icon = cfg.icon;
              return (
                <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${cfg.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{doc.nom}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {doc.taille && (
                            <span className="text-xs text-muted-foreground">{formatSize(doc.taille)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {doc.patients && (
                            <Link
                              href={`/patients/${doc.patients.npi}`}
                              className="flex items-center gap-1 hover:text-medical-green"
                            >
                              <span className="font-medium text-foreground">
                                {doc.patients.prenom} {doc.patients.nom}
                              </span>
                              <span className="font-mono">{doc.patients.npi}</span>
                            </Link>
                          )}
                          <span>{formatDateTime(doc.uploaded_at)}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{doc.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.url, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Ouvrir
                        </Button>
                        {doc.patients && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/patients/${doc.patients.npi}`}>
                              Dossier
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
