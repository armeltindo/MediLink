import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Header } from "@/components/layout/header";
import { ShieldX } from "lucide-react";
import { EtablissementsClient, EtablissementRow } from "./etablissements-client";

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
      <div className="flex flex-col min-h-full">
        <Header title="Établissements" />
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <ShieldX className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Accès refusé</p>
          <p className="text-sm">Vous n&apos;avez pas les permissions pour consulter cette page.</p>
        </div>
      </div>
    );
  }

  let rows: EtablissementRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("etablissements")
      .select("id, nom, type, ville, region, pays, adresse, telephone, email, logo_url, created_at")
      .is("deleted_at", null)
      .order("nom");
    rows = (data as EtablissementRow[]) || [];
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Établissements" />
      <div className="p-6">
        <EtablissementsClient rows={rows} />
      </div>
    </div>
  );
}
