import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { anthropic, CLINICAL_SYSTEM_PROMPT } from "@/lib/anthropic";
import { formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ alerts: [] });

    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ alerts: [] });

    // Load relevant data for alerts
    const [prescriptionsRes, allergiesRes, analysesRes, constRes, vaccinsRes] = await Promise.all([
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).in("statut", ["prescrit", "en_cours"]),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("resultats_analyse").select("*").eq("patient_id", patientId).order("date_resultat", { ascending: false }).limit(20),
      supabase.from("constantes").select("*").eq("patient_id", patientId).order("date_mesure", { ascending: false }).limit(10),
      supabase.from("vaccinations").select("*").eq("patient_id", patientId),
    ]);

    const prescriptions = prescriptionsRes.data || [];
    const allergies = allergiesRes.data || [];
    const analyses = analysesRes.data || [];
    const constantes = constRes.data || [];
    const vaccins = vaccinsRes.data || [];

    // Check for upcoming expirations (client-side quick check)
    const quickAlerts: Array<{ type: string; titre: string; message: string }> = [];

    // Check expiring prescriptions
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    prescriptions.forEach((p) => {
      if (p.date_expiration) {
        const exp = new Date(p.date_expiration);
        if (exp <= sevenDays && exp >= new Date()) {
          quickAlerts.push({
            type: "warning",
            titre: "Ordonnance expirante",
            message: `${p.medicament_dci} ${p.dosage} expire le ${formatDate(p.date_expiration)}`,
          });
        }
      }
    });

    // Check overdue vaccines
    vaccins.forEach((v) => {
      if (v.statut === "en_retard") {
        quickAlerts.push({
          type: "warning",
          titre: "Vaccin en retard",
          message: `${v.vaccin} — rappel prévu le ${formatDate(v.prochain_rappel)}`,
        });
      }
    });

    // Check abnormal constantes
    const lastConst = constantes[0];
    if (lastConst) {
      if (lastConst.ta_sys && lastConst.ta_sys >= 160) {
        quickAlerts.push({
          type: "danger",
          titre: "Hypertension sévère",
          message: `Dernière TA : ${lastConst.ta_sys}/${lastConst.ta_dia} mmHg — seuil critique dépassé`,
        });
      }
      if (lastConst.spo2 && lastConst.spo2 < 92) {
        quickAlerts.push({
          type: "danger",
          titre: "Désaturation oxygène",
          message: `SpO₂ : ${lastConst.spo2}% — valeur inférieure au seuil d'alerte (94%)`,
        });
      }
    }

    // Check abnormal analyses
    analyses.forEach((r) => {
      if (r.valeur !== null && r.valeur_max !== null && r.valeur > r.valeur_max * 1.5) {
        quickAlerts.push({
          type: "warning",
          titre: `${r.parametre} élevé`,
          message: `Valeur : ${r.valeur} ${r.unite || ""} (norme : ≤ ${r.valeur_max})`,
        });
      }
    });

    // If no complex data, return quick alerts only
    if (prescriptions.length === 0 && analyses.length === 0) {
      return NextResponse.json({ alerts: quickAlerts.slice(0, 5) });
    }

    // For more complex analysis, use AI
    const drugList = prescriptions.map((p) => p.medicament_dci).join(", ");
    const allergyList = allergies.map((a) => a.substance).join(", ");

    if (!drugList && quickAlerts.length > 0) {
      return NextResponse.json({ alerts: quickAlerts.slice(0, 5) });
    }

    const prompt = `Analyse rapide pour alertes cliniques :

**Médicaments en cours :** ${drugList || "Aucun"}
**Allergies connues :** ${allergyList || "Aucune"}
**Derniers résultats d'analyses :** ${analyses.slice(0, 5).map((r) => `${r.parametre}: ${r.valeur} ${r.unite || ""} (norme ${r.valeur_min}-${r.valeur_max})`).join(", ") || "Non disponibles"}

Identifie uniquement :
1. Les interactions médicamenteuses cliniquement significatives entre les médicaments listés
2. Les résultats biologiques critiques qui nécessitent une attention immédiate

Réponds UNIQUEMENT en JSON valide, tableau d'alertes (max 3) :
[{"type": "danger|warning|info", "titre": "...", "message": "..."}]

Si aucune alerte : []`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: CLINICAL_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const text = (message.content[0] as { type: string; text: string }).text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const aiAlerts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      const allAlerts = [...aiAlerts, ...quickAlerts].slice(0, 6);
      return NextResponse.json({ alerts: allAlerts });
    } catch {
      return NextResponse.json({ alerts: quickAlerts.slice(0, 5) });
    }
  } catch (error: unknown) {
    console.error("AI Alerts error:", error);
    return NextResponse.json({ alerts: [] });
  }
}
