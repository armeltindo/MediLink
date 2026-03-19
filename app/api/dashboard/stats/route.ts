import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      patientsToday: 0, consultationsWeek: 0,
      prescriptionsExpiring: 0, analysesEnAttente: 0,
      rendezVousAujourdhui: 0, hospitalisationsEnCours: 0,
      recentActivity: [], rendezVousDuJour: [],
    });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    patientsRes, consultationsRes, prescriptionsRes, analysesRes, activityRes,
    rdvCountRes, hospiRes, rdvListRes,
  ] = await Promise.allSettled([
    supabase.from("patients").select("id", { count: "exact" }).gte("created_at", startOfDay).is("deleted_at", null),
    supabase.from("consultations").select("id", { count: "exact" }).gte("date_consultation", startOfWeek).is("deleted_at", null),
    supabase.from("prescriptions").select("id", { count: "exact" }).in("statut", ["prescrit", "en_cours"]).lte("date_expiration", sevenDaysLater).gte("date_expiration", now.toISOString()),
    supabase.from("analyses_prescrites").select("id", { count: "exact" }).in("statut", ["prescrit", "en_attente"]),
    supabase.from("audit_logs").select("action, timestamp, patients(prenom, nom)").order("timestamp", { ascending: false }).limit(10),
    supabase.from("rendez_vous").select("id", { count: "exact" }).gte("date_heure", startOfDay).lte("date_heure", endOfDay).in("statut", ["planifié", "confirmé"]),
    supabase.from("hospitalisations").select("id", { count: "exact" }).is("date_sortie", null).is("deleted_at", null),
    supabase.from("rendez_vous").select("id, date_heure, type_rdv, statut, patients(prenom, nom)").gte("date_heure", startOfDay).lte("date_heure", endOfDay).in("statut", ["planifié", "confirmé"]).order("date_heure").limit(5),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;
  const empty = { data: [] as never[], count: 0, error: null, status: 200, statusText: "OK" } as never;

  const [p, c, rx, a, activity, rdvCount, hospi, rdvList] = [
    get(patientsRes, empty), get(consultationsRes, empty),
    get(prescriptionsRes, empty), get(analysesRes, empty),
    get(activityRes, empty), get(rdvCountRes, empty),
    get(hospiRes, empty), get(rdvListRes, empty),
  ];

  const recentActivity = (activity.data || []).map((item: {
    action: string; timestamp: string;
    patients?: { prenom: string; nom: string }[] | { prenom: string; nom: string } | null;
  }) => {
    const pat = Array.isArray(item.patients) ? item.patients[0] : item.patients;
    return { action: item.action, patientNom: pat ? `${pat.prenom} ${pat.nom}` : "—", timestamp: item.timestamp };
  });

  const rendezVousDuJour = (rdvList.data || []).map((r: {
    id: string; date_heure: string; type_rdv: string; statut: string;
    patients?: { prenom: string; nom: string }[] | { prenom: string; nom: string } | null;
  }) => {
    const pat = Array.isArray(r.patients) ? r.patients[0] : r.patients;
    return { id: r.id, date_heure: r.date_heure, type_rdv: r.type_rdv, statut: r.statut, patientNom: pat ? `${pat.prenom} ${pat.nom}` : "—" };
  });

  return NextResponse.json({
    patientsToday: p.count || 0,
    consultationsWeek: c.count || 0,
    prescriptionsExpiring: rx.count || 0,
    analysesEnAttente: a.count || 0,
    rendezVousAujourdhui: rdvCount.count || 0,
    hospitalisationsEnCours: hospi.count || 0,
    recentActivity,
    rendezVousDuJour,
  });
}
