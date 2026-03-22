import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Header } from "@/components/layout/header";
import { InventaireClient, type StockItem } from "./inventaire-client";
import { cookies } from "next/headers";

export default async function InventairePage() {
  let items: StockItem[] = [];
  let userRole: string | null = null;
  let pharmacieId: string | null = null;
  let pharmacieNom: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      userRole = profile?.role ?? null;

      if (userRole === "pharmacien" || userRole === "super_admin") {
        const cookieStore = await cookies();
        const cookieEtabId = cookieStore.get("selected_etablissement_id")?.value;

        const { data: junctions } = await supabase
          .from("user_etablissements")
          .select("etablissement_id, etablissements(id, nom, type)")
          .eq("user_id", user.id)
          .is("suspended_at", null);

        type JunctionEtab = { id: string; nom: string; type: string };
        type Junction = {
          etablissement_id: string;
          etablissements: JunctionEtab | JunctionEtab[] | null;
        };
        const etabOf = (j: Junction): JunctionEtab | null =>
          Array.isArray(j.etablissements) ? (j.etablissements[0] ?? null) : (j.etablissements ?? null);

        const pharmacies = (junctions as unknown as Junction[] ?? []).filter(
          (j) => etabOf(j)?.type === "pharmacie"
        );
        // Fallback sur la première pharmacie si le cookie pointe ailleurs
        const active = cookieEtabId
          ? (pharmacies.find((j) => j.etablissement_id === cookieEtabId) ?? pharmacies[0])
          : pharmacies[0];

        if (active) {
          pharmacieId  = active.etablissement_id;
          pharmacieNom = etabOf(active)?.nom ?? null;

          const { data } = await supabase
            .from("stock_medicaments")
            .select("*")
            .eq("pharmacie_id", pharmacieId)
            .is("deleted_at", null)
            .order("medicament_dci");

          items = (data as StockItem[]) ?? [];
        }
      }
    }
  } catch (err) {
    console.error("[inventaire/page] erreur chargement:", err);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Inventaire médicaments" />
      <div className="p-6">
        <InventaireClient
          initialItems={items}
          pharmacieId={pharmacieId}
          pharmacieNom={pharmacieNom}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
