export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// This endpoint creates demo users in Supabase Auth + users_profiles.
// Call it once after deployment: GET /api/seed
// It is idempotent — safe to call multiple times.

const USERS = [
  {
    email: "armeltindo@gmail.com",
    password: "admin123",
    role: "super_admin",
    nom: "Armeltindo",
    prenom: "Admin",
    specialite: null,
    etablissement_id: null,
  },
  {
    email: "admin@medilink.bj",
    password: "demo123",
    role: "admin_etablissement",
    nom: "Dossou",
    prenom: "Clarisse",
    specialite: null,
    etablissement_id: "e1000000-0000-0000-0000-000000000001",
  },
  {
    email: "dr.agossou@medilink.bj",
    password: "demo123",
    role: "medecin",
    nom: "Agossou",
    prenom: "Romuald",
    specialite: "Médecine générale",
    etablissement_id: "e1000000-0000-0000-0000-000000000001",
  },
  {
    email: "pharma@medilink.bj",
    password: "demo123",
    role: "pharmacien",
    nom: "Garba",
    prenom: "Moussa",
    specialite: "Pharmacie",
    etablissement_id: "e1000000-0000-0000-0000-000000000002",
  },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  // Use service role — bypasses RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createClient<any>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  for (const user of USERS) {
    try {
      // Try to create the user in Auth
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      let uid: string;

      if (error) {
        if (error.message.includes("already been registered") || error.message.includes("already exists")) {
          // User exists — fetch their UUID
          const { data: list } = await admin.auth.admin.listUsers();
          const existing = list?.users?.find((u) => u.email === user.email);
          if (!existing) {
            results[user.email] = `skip (exists but not found): ${error.message}`;
            continue;
          }
          uid = existing.id;
        } else {
          results[user.email] = `auth error: ${error.message}`;
          continue;
        }
      } else {
        uid = data.user.id;
      }

      // Upsert profile
      const { error: profileError } = await admin
        .from("users_profiles")
        .upsert(
          {
            id: uid,
            role: user.role,
            nom: user.nom,
            prenom: user.prenom,
            specialite: user.specialite,
            etablissement_id: user.etablissement_id,
          },
          { onConflict: "id" }
        );

      results[user.email] = profileError
        ? `profile error: ${profileError.message}`
        : "ok";
    } catch (e) {
      results[user.email] = `exception: ${String(e)}`;
    }
  }

  // Seed etablissements if empty
  const { data: existingEtab } = await admin.from("etablissements").select("id").limit(1);
  if (!existingEtab || existingEtab.length === 0) {
    await admin.from("etablissements").insert([
      { id: "e1000000-0000-0000-0000-000000000001", nom: "CNHU Hubert Koutoukou Maga", type: "CHU", ville: "Cotonou", region: "Littoral", pays: "Bénin", adresse: "Avenue Jean-Paul II, Cotonou", telephone: "+229 21 30 01 55" },
      { id: "e1000000-0000-0000-0000-000000000002", nom: "Centre de Santé de Cadjehoun", type: "CSP", ville: "Cotonou", region: "Littoral", pays: "Bénin", adresse: "Rue 10.115, Cadjehoun", telephone: "+229 21 30 22 44" },
      { id: "e1000000-0000-0000-0000-000000000003", nom: "Clinique Internationale de Cotonou", type: "clinique", ville: "Cotonou", region: "Littoral", pays: "Bénin", adresse: "Boulevard de la Marina", telephone: "+229 21 31 40 40" },
      { id: "e1000000-0000-0000-0000-000000000004", nom: "Hôpital de Zone de Parakou", type: "hopital", ville: "Parakou", region: "Borgou", pays: "Bénin", adresse: "Avenue de l'Université", telephone: "+229 23 61 05 20" },
    ]);
    results["etablissements"] = "seeded";
  } else {
    results["etablissements"] = "already exists";
  }

  return NextResponse.json({ results });
}
