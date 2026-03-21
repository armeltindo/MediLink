import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json([]);
  }
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("patients")
    .select("imu, nom, prenom, date_naissance, sexe, groupe_sanguin, rhesus, nationalite, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}
