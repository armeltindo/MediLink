export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

async function getPharmacienProfile(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["pharmacien", "super_admin"].includes(profile.role)) return null;
  return { userId: user.id, role: profile.role };
}

// GET /api/pharmacie/stock?pharmacie_id=xxx
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServer();
  const auth = await getPharmacienProfile(supabase);
  if (!auth) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const pharmacieId = req.nextUrl.searchParams.get("pharmacie_id");
  if (!pharmacieId) return NextResponse.json({ error: "pharmacie_id requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("stock_medicaments")
    .select("*")
    .eq("pharmacie_id", pharmacieId)
    .is("deleted_at", null)
    .order("medicament_dci");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/pharmacie/stock — créer une entrée stock
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const auth = await getPharmacienProfile(supabase);
  if (!auth) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { pharmacie_id, medicament_dci, medicament_commercial, forme, unite,
          quantite_stock, seuil_alerte, lot, date_peremption } = body;

  if (!pharmacie_id || !medicament_dci) {
    return NextResponse.json({ error: "pharmacie_id et medicament_dci requis" }, { status: 400 });
  }
  if (typeof quantite_stock !== "number" || quantite_stock < 0) {
    return NextResponse.json({ error: "quantite_stock doit être un entier >= 0" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stock_medicaments")
    .insert({
      pharmacie_id, medicament_dci,
      medicament_commercial: medicament_commercial ?? null,
      forme: forme ?? null,
      unite: unite ?? "comprimé",
      quantite_stock,
      seuil_alerte: seuil_alerte ?? 10,
      lot: lot ?? null,
      date_peremption: date_peremption ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/pharmacie/stock — mettre à jour une entrée stock
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServer();
  const auth = await getPharmacienProfile(supabase);
  if (!auth) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  // N'autoriser que les champs modifiables
  const allowed = ["medicament_dci","medicament_commercial","forme","unite",
                   "quantite_stock","seuil_alerte","lot","date_peremption"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const { data, error } = await supabase
    .from("stock_medicaments")
    .update(update)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/pharmacie/stock — soft-delete
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServer();
  const auth = await getPharmacienProfile(supabase);
  if (!auth) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const { error } = await supabase
    .from("stock_medicaments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
