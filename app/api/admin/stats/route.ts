import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      totalPatients: 0, totalConsultations: 0, totalHospitalisations: 0,
      hospitalisationsEnCours: 0, totalEtablissements: 0,
      topDiagnostics: [], repartitionSexe: [{ name: "Hommes", value: 0 }, { name: "Femmes", value: 0 }],
      activiteMedecins: [],
    });
  }

  const supabase = createServerSupabaseClient();

  const results = await Promise.allSettled([
    supabase.from("patients").select("id, sexe", { count: "exact" }).is("deleted_at", null),
    supabase.from("consultations").select("id", { count: "exact" }).is("deleted_at", null),
    supabase.from("hospitalisations").select("id", { count: "exact" }).is("deleted_at", null),
    supabase.from("hospitalisations").select("id", { count: "exact" }).is("date_sortie", null).is("deleted_at", null),
    supabase.from("etablissements").select("id", { count: "exact" }).is("deleted_at", null),
    supabase.from("consultations").select("diagnostic_cim10").not("diagnostic_cim10", "is", null).is("deleted_at", null).limit(500),
    supabase.from("consultations").select("medecin_id, users_profiles(nom, prenom)").is("deleted_at", null).limit(500),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;
  const empty = { data: [] as never[], count: 0, error: null };

  const [patientsRes, consultRes, hospitRes, hospitEnCoursRes, etablRes, diagRes, medecinConsultRes] = [
    get(results[0], empty), get(results[1], empty), get(results[2], empty),
    get(results[3], empty), get(results[4], empty), get(results[5], empty),
    get(results[6], empty),
  ];

  const diagCount: Record<string, number> = {};
  (diagRes.data || []).forEach((c: { diagnostic_cim10?: string }) => {
    if (c.diagnostic_cim10) diagCount[c.diagnostic_cim10] = (diagCount[c.diagnostic_cim10] || 0) + 1;
  });
  const topDiagnostics = Object.entries(diagCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([code, count]) => ({ code, libelle: code, count }));

  const patients = patientsRes.data || [];
  const hommes = patients.filter((p: { sexe: string }) => p.sexe === "M").length;
  const femmes = patients.filter((p: { sexe: string }) => p.sexe === "F").length;

  const medecinCount: Record<string, { nom: string; count: number }> = {};
  (medecinConsultRes.data || []).forEach((c: { medecin_id: unknown; users_profiles?: unknown }) => {
    const id = c.medecin_id as string;
    if (id) {
      if (!medecinCount[id]) {
        const profiles = c.users_profiles as { nom: string; prenom: string }[] | { nom: string; prenom: string } | null;
        const p = Array.isArray(profiles) ? profiles[0] : profiles;
        medecinCount[id] = { nom: p ? `Dr. ${p.prenom} ${p.nom}` : id.slice(0, 8), count: 0 };
      }
      medecinCount[id].count++;
    }
  });
  const activiteMedecins = Object.values(medecinCount)
    .sort((a, b) => b.count - a.count).slice(0, 8)
    .map((m) => ({ nom: m.nom, consultations: m.count }));

  return NextResponse.json({
    totalPatients: patientsRes.count || 0,
    totalConsultations: consultRes.count || 0,
    totalHospitalisations: hospitRes.count || 0,
    hospitalisationsEnCours: hospitEnCoursRes.count || 0,
    totalEtablissements: etablRes.count || 0,
    topDiagnostics,
    repartitionSexe: [{ name: "Hommes", value: hommes }, { name: "Femmes", value: femmes }],
    activiteMedecins,
  });
}
