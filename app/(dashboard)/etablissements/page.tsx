import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail } from "lucide-react";

interface EtablissementRow {
  id: string;
  nom: string;
  type_etablissement: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  hopital: "Hôpital",
  clinique: "Clinique",
  cabinet: "Cabinet médical",
  pharmacie: "Pharmacie",
  laboratoire: "Laboratoire",
  autre: "Autre",
};

async function getUserRole(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const cookieStore = await cookies();
    const raw = cookieStore.get("demo_session")?.value;
    if (!raw) return null;
    try { return JSON.parse(raw).role ?? null; } catch { return null; }
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users_profiles").select("role").eq("id", user.id).single();
  return profile?.role ?? null;
}

export default async function EtablissementsPage() {
  const role = await getUserRole();

  if (role && role !== "super_admin" && role !== "admin_etablissement") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Accès refusé</p>
      </div>
    );
  }

  let rows: EtablissementRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("etablissements")
      .select("id, nom, type_etablissement, adresse, telephone, email, created_at")
      .is("deleted_at", null)
      .order("nom");
    rows = (data as EtablissementRow[]) || [];
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Établissements" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          {rows.length} établissement{rows.length > 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-medical-green/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-medical-green" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{e.nom}</CardTitle>
                    {e.type_etablissement && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeLabels[e.type_etablissement] || e.type_etablissement}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {e.adresse && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{e.adresse}</span>
                  </div>
                )}
                {e.telephone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <a href={`tel:${e.telephone}`} className="hover:text-foreground">{e.telephone}</a>
                  </div>
                )}
                {e.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${e.email}`} className="hover:text-foreground truncate">{e.email}</a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {rows.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun établissement enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
