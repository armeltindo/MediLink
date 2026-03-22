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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pharmacies = (junctions ?? []).filter((j: any) => j.etablissements?.type === "pharmacie");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const active = cookieEtabId ? pharmacies.find((j: any) => j.etablissement_id === cookieEtabId) : pharmacies[0];

        if (active) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pharmacieId  = (active as any).etablissement_id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pharmacieNom = (active as any).etablissements?.nom ?? null;

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
