import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      patientsToday: 0, consultationsWeek: 0,
      prescriptionsExpiring: 0, analysesEnAttente: 0, recentActivity: [],
    });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [patientsRes, consultationsRes, prescriptionsRes, analysesRes, activityRes] = await Promise.allSettled([
    supabase.from("patients").select("id", { count: "exact" }).gte("created_at", startOfDay).is("deleted_at", null),
    supabase.from("consultations").select("id", { count: "exact" }).gte("date_consultation", startOfWeek).is("deleted_at", null),
    supabase.from("prescriptions").select("id", { count: "exact" }).in("statut", ["prescrit", "en_cours"]).lte("date_expiration", sevenDaysLater).gte("date_expiration", now.toISOString()),
    supabase.from("analyses_prescrites").select("id", { count: "exact" }).in("statut", ["prescrit", "en_attente"]),
    supabase.from("audit_logs").select("action, timestamp, patients(prenom, nom)").order("timestamp", { ascending: false }).limit(10),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;
  const empty = { data: [] as never[], count: 0, error: null };

  const [p, c, rx, a, activity] = [
    get(patientsRes, empty), get(consultationsRes, empty),
    get(prescriptionsRes, empty), get(analysesRes, empty),
    get(activityRes, empty),
  ];

  const recentActivity = (activity.data || []).map((a: {
    action: string; timestamp: string;
    patients?: { prenom: string; nom: string }[] | { prenom: string; nom: string } | null;
  }) => {
    const pat = Array.isArray(a.patients) ? a.patients[0] : a.patients;
    return { action: a.action, patientNom: pat ? `${pat.prenom} ${pat.nom}` : "—", timestamp: a.timestamp };
  });

  return NextResponse.json({
    patientsToday: p.count || 0,
    consultationsWeek: c.count || 0,
    prescriptionsExpiring: rx.count || 0,
    analysesEnAttente: a.count || 0,
    recentActivity,
  });
}
