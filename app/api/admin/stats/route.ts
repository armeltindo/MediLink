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
    supabase.rpc("get_top_diagnostics", { p_limit: 10 }),
    supabase.rpc("get_top_medecins", { p_limit: 8 }),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;
  const empty = { data: [] as never[], count: 0, error: null, status: 200, statusText: "OK" } as never;

  const [patientsRes, consultRes, hospitRes, hospitEnCoursRes, etablRes, diagRes, medecinRes] = [
    get(results[0], empty), get(results[1], empty), get(results[2], empty),
    get(results[3], empty), get(results[4], empty), get(results[5], empty),
    get(results[6], empty),
  ];

  const topDiagnostics = (diagRes.data || []).map((r: { code: string; count: number }) => ({
    code: r.code,
    libelle: r.code,
    count: Number(r.count),
  }));

  const patients = patientsRes.data || [];
  const hommes = patients.filter((p: { sexe: string }) => p.sexe === "M").length;
  const femmes = patients.filter((p: { sexe: string }) => p.sexe === "F").length;

  const activiteMedecins = (medecinRes.data || []).map((m: { nom: string; consultations: number }) => ({
    nom: m.nom,
    consultations: Number(m.consultations),
  }));

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
